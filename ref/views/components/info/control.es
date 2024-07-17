/* global config, toggleModal, getStore, toast */
import fs from 'fs-extra'
import path from 'path-extra'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { shell, clipboard, nativeImage, ipcRenderer } from 'electron'
import * as remote from '@electron/remote'
import { Button, Position } from '@blueprintjs/core'
import { connect } from 'react-redux'
import { get, padStart } from 'lodash'
import { gameRefreshPage, gameReload } from 'views/services/utils'
import { withNamespaces, Trans } from 'react-i18next'
import { styled, css } from 'styled-components'
import { CustomTag } from 'views/components/etc/custom-tag'
import { Tooltip } from 'views/components/etc/overlay'

const { openExternal } = shell

const openItemAsync = (dir, source = null) => {
  openExternal(`file://${dir}`, {}, (err) => {
    if (err) {
      const prefix = (source && `${source}: `) || ''
      console.error(`${prefix}Failed to open item "${dir}" asynchronously`, err)
    }
  })
}

const PoiControlTag = styled(CustomTag)`
  width: 0;
  transition: 0.3s 0.2s;
  display: flex;
  flex-direction: row;
  ${({ extend }) =>
    extend
      ? css`
          flex: 0 0 270px;
        `
      : css`
          flex: 0 0 120px;
        `}
`

const PoiControlInner = styled.div`
  white-space: nowrap;
  overflow: hidden;
  flex: 1;
`

// Controller icon bar
// const {openFocusedWindowDevTools} = remote.require('./lib/window')

const formatDate = (date) => do {
  const pad2 = (x) => padStart(x, 2, '0')
  const datePart = do {
    const yyyy = date.getFullYear()
    const mm = pad2(date.getMonth() + 1)
    const dd = pad2(date.getDate())
    ;`${yyyy}-${mm}-${dd}`
  }
  const timePart = do {
    const hh = pad2(date.getHours())
    const mm = pad2(date.getMinutes())
    const ss = pad2(date.getSeconds())
    ;`${hh}.${mm}.${ss}`
  }
  ;`${datePart}T${timePart}`
}

@withNamespaces()
@connect((state, props) => ({
  muted: get(state, 'config.poi.content.muted', false),
  editable: get(state, 'config.poi.layout.editable', false),
}))
export class PoiControl extends Component {
  static propTypes = {
    muted: PropTypes.bool,
  }

  state = {
    extend: false,
  }

  handleCapturePage = async (toClipboard) => {
    if (config.get('poi.misc.screenshot.usecanvas')) {
      this.handleCapturePageOverCanvas(toClipboard)
    } else {
      this.handleCapturePageOverWebContent(toClipboard)
    }
  }

  handleCapturePageOverCanvas = async (toClipboard) => {
    const dataURL = await getStore('layout.webview.ref')
      .getWebContents()
      .executeJavaScript(`capture(${!!toClipboard})`)
    if (!dataURL) {
      await this.handleCapturePageOverWebContent(toClipboard)
    } else {
      await this.handleScreenshotCaptured(dataURL, toClipboard)
    }
  }

  handleCapturePageOverWebContent = async (toClipboard) => {
    const { width, height } = getStore('layout.webview')
    const webContentId = getStore('layout.webview.ref').getWebContentsId()
    const actualSize = { width: Math.round(width), height: Math.round(height) }
    const rect = {
      x: 0,
      y: 0,
      width: Math.floor(width * devicePixelRatio),
      height: Math.floor(height * devicePixelRatio),
    }
    try {
      const dataURL =
        (await ipcRenderer.invoke('screenshot::get', webContentId, rect, actualSize)) ||
        (await remote.webContents.fromId(webContentId).capturePage(rect))
          .resize(actualSize)
          .toDataURL()
      this.handleScreenshotCaptured(dataURL, toClipboard)
    } catch (error) {
      this.handleScreenshotFailure(error)
    }
  }

  handleScreenshotCaptured = async (dataURL, toClipboard) => {
    const screenshotPath = config.get(
      'poi.misc.screenshot.path',
      remote.getGlobal('DEFAULT_SCREENSHOT_PATH'),
    )
    const usePNG = config.get('poi.misc.screenshot.format', 'png') === 'png'

    const image = nativeImage.createFromDataURL(dataURL)
    if (toClipboard) {
      clipboard.writeImage(image)
      window.success(this.props.t('screenshot saved to clipboard'))
    } else {
      const buf = usePNG ? image.toPNG() : image.toJPEG(80)
      const date = formatDate(new Date())
      const filename = path.join(screenshotPath, `${date}.${usePNG ? 'png' : 'jpg'}`)
      try {
        await fs.ensureDir(screenshotPath)
        await fs.writeFile(filename, buf)
        window.success(`${this.props.t('screenshot saved to')} ${filename}`)
      } catch (error) {
        this.handleScreenshotFailure(error)
      }
    }
  }

  handleScreenshotFailure = (error) => {
    if (error) {
      console.error(error)
    }
    window.error(this.props.t('Failed to save the screenshot'))
  }

  handleOpenCacheFolder = () => {
    try {
      const dir = config.get('poi.misc.cache.path', remote.getGlobal('DEFAULT_CACHE_PATH'))
      fs.ensureDirSync(dir)
      fs.ensureDirSync(path.join(dir, 'KanColle'))
      fs.ensureDirSync(path.join(dir, 'ShiroPro'))
      fs.ensureDirSync(path.join(dir, 'Shinken'))
      fs.ensureDirSync(path.join(dir, 'Kanpani'))
      fs.ensureDirSync(path.join(dir, 'FlowerKnightGirls'))
      fs.ensureDirSync(path.join(dir, 'ToukenRanbu'))
      openItemAsync(dir, 'handleOpenCacheFolder')
    } catch (e) {
      window.toggleModal(this.props.t('Open cache dir'), this.props.t('NoPermission'))
    }
  }

  handleOpenMakaiFolder = () => {
    let dir = config.get('poi.misc.cache.path', remote.getGlobal('DEFAULT_CACHE_PATH'))
    dir = path.join(dir, 'KanColle', 'kcs2', 'resources', 'ship')
    try {
      fs.ensureDirSync(dir)
      openItemAsync(dir, 'handleOpenMakaiFolder')
    } catch (e) {
      window.toggleModal(this.props.t('Open makai dir'), this.props.t('NoPermission'))
    }
  }

  handleOpenScreenshotFolder = () => {
    try {
      const screenshotPath = config.get(
        'poi.misc.screenshot.path',
        remote.getGlobal('DEFAULT_SCREENSHOT_PATH'),
      )
      fs.ensureDirSync(screenshotPath)
      openItemAsync(screenshotPath, 'handleOpenScreenshotFolder')
    } catch (e) {
      window.toggleModal(this.props.t('Open screenshot dir'), this.props.t('NoPermission'))
    }
  }

  handleSetMuted = () => {
    config.set('poi.content.muted', !this.props.muted)
  }

  editableTimeout = 0

  editableConfigList = [
    'poi.mainpanel.layout',
    'poi.webview.ratio.horizontal',
    'poi.webview.ratio.vertical',
    'poi.tabarea.overlaypanelwidth',
    'poi.tabarea.mainpanelwidth',
    'poi.tabarea.mainpanelheight',
  ]

  enableEditableMsg() {
    toast(this.props.t('If no changes, panel will be locked automatically in 1 minute'), {
      title: this.props.t('Panel unlocked'),
    })
    this.disableEditableMsg()
  }

  disableEditableMsg() {
    clearTimeout(this.editableTimeout)
    this.editableTimeout = setTimeout(() => {
      config.set('poi.layout.editable', false)
      toast(this.props.t('You can unlock it manually'), {
        title: this.props.t('Panel locked'),
      })
    }, 60000)
  }

  handleConfigChange = (path, value) => {
    if (this.editableConfigList.includes(path)) {
      if (this.props.editable) {
        this.disableEditableMsg()
      }
    }
  }

  handleSetEditable = () => {
    if (!this.props.editable) {
      this.enableEditableMsg()
    } else {
      clearTimeout(this.editableTimeout)
    }
    config.set('poi.layout.editable', !this.props.editable)
  }

  handleOpenDevTools = () => {
    // openFocusedWindowDevTools()
    remote.getCurrentWindow().openDevTools({ mode: 'detach' })
    setTimeout(() => {
      getStore('layout.webview.ref').executeJavaScript('window.align()')
    }, 500)
  }

  handleOpenWebviewDevTools = () => {
    getStore('layout.webview.ref').openDevTools({ mode: 'detach' })
  }

  handleJustifyLayout = (e) => {
    getStore('layout.webview.ref').executeJavaScript('window.align()')
    e.preventDefault()
  }

  handleUnlockWebview = () => {
    getStore('layout.webview.ref').executeJavaScript('window.unalign()')
  }

  handleRefreshGameDialog = (e) => {
    if (e.shiftKey) {
      gameRefreshPage()
      return
    }

    toggleModal(
      this.props.t('Confirm Refreshing'),
      <div>
        <Trans i18nKey="RefreshGameDialogTip">
          Are you sure to refresh the game?
          <ul>
            <li>Refresh page is the same as pressing F5.</li>
            <li>
              Reload game reloads only the game frame, this is usually faster but could result in
              catbomb.
            </li>
          </ul>
          Tip: Right clicking on this button reloads the game and Left clicking with Shift key
          pressed refreshes the page, both are <b>without confirmation</b>, use at your own risk.
        </Trans>
      </div>,
      [
        { name: this.props.t('Refresh page'), func: gameRefreshPage, style: 'warning' },
        { name: this.props.t('Reload game'), func: gameReload, style: 'danger' },
      ],
    )
  }

  handleSetExtend = () => {
    this.setState({
      extend: !this.state.extend,
      transition: true,
    })
  }

  handleTransitionEnd = () => {
    this.setState({ transition: false })
  }

  handleTouchbar = (props) => {
    //load Touchbar-related functions only when touchbar is triggered
    const { toggleRefreshConfirm, renderMainTouchbar } = remote.require('./lib/touchbar')
    //workaround for the input event not defined
    switch (props) {
      case 'refresh':
        toggleModal(
          this.props.t('Confirm Refreshing'),
          <div>
            <Trans i18nKey="RefreshGameDialogTip">
              Are you sure to refresh the game?
              <ul>
                <li>Refresh page is the same as pressing F5.</li>
                <li>
                  Reload game reloads only the game frame, this is usually faster but could result
                  in catbomb.
                </li>
              </ul>
              Tip: Right clicking on this button reloads the game and Left clicking with Shift key
              pressed refreshes the page, both are <b>without confirmation</b>, use at your own
              risk.
            </Trans>
          </div>,
          [
            { name: this.props.t('Refresh page'), func: gameRefreshPage, style: 'warning' },
            { name: this.props.t('Reload game'), func: gameReload, style: 'danger' },
          ],
          () => {
            renderMainTouchbar()
          },
        )
        toggleRefreshConfirm(this.props.t('Refresh page'), this.props.t('Reload game'))
        break
      case 'adjust':
        window.dispatchEvent(new Event('resize'))
        break
      case 'unlock':
        this.handleUnlockWebview()
        break
      case 'screenshotdir':
        this.handleOpenScreenshotFolder()
        break
      case 'cachedir':
        this.handleOpenCacheFolder()
        break
      case 'volume':
        this.handleSetMuted()
        break
      case 'screenshot':
        this.handleCapturePage()
        break
      case 'gameReload':
        gameReload()
        break
      case 'gameRefreshPage':
        gameRefreshPage()
        break
      case 'edit':
        this.handleSetEditable()
        break
      default:
    }
  }

  touchbarListener = (event, message) => {
    this.handleTouchbar(message)
  }

  renderButton = ({ label, ...props }) => (
    <Tooltip
      key={label}
      position={Position.TOP_LEFT}
      content={label}
      disabled={this.state.transition}
    >
      <Button {...props} minimal />
    </Tooltip>
  )

  componentDidMount = () => {
    if (this.props.editable) {
      this.disableEditableMsg()
    }
    config.addListener('config.set', this.handleConfigChange)
    //Stateless touchbar input receiver
    if (process.platform === 'darwin') {
      require('electron').ipcRenderer.addListener('touchbar', this.touchbarListener)
    }
  }

  componentWillUnmount = () => {
    config.removeListener('config.set', this.handleConfigChange)
    if (process.platform === 'darwin') {
      require('electron').ipcRenderer.removeListener('touchbar', this.touchbarListener)
    }
  }

  render() {
    if (process.platform === 'darwin') {
      const { updateTouchbarInfoIcons } = remote.require('./lib/touchbar')
      updateTouchbarInfoIcons()
    }
    const list = [
      {
        onClick: this.handleOpenDevTools,
        onContextMenu: this.handleOpenWebviewDevTools,
        label: this.props.t('Developer Tools'),
        icon: 'console',
      },
      {
        onClick: () => this.handleCapturePage(false),
        onContextMenu: () => this.handleCapturePage(true),
        label: this.props.t('Take a screenshot'),
        icon: 'camera',
      },
      {
        onClick: this.handleSetMuted,
        onContextMenu: null,
        label: this.props.muted ? this.props.t('Volume on') : this.props.t('Volume off'),
        icon: this.props.muted ? 'volume-off' : 'volume-up',
      },
      {
        onClick: this.handleOpenCacheFolder,
        onContextMenu: null,
        label: this.props.t('Open cache dir'),
        icon: 'social-media',
      },
      {
        onClick: this.handleOpenScreenshotFolder,
        onContextMenu: null,
        label: this.props.t('Open screenshot dir'),
        icon: 'media',
      },
      {
        onClick: this.handleJustifyLayout,
        onContextMenu: this.handleUnlockWebview,
        label: this.props.t('Auto adjust'),
        icon: 'fullscreen',
      },
      {
        onClick: this.handleSetEditable,
        onContextMenu: null,
        label: this.props.editable ? this.props.t('Lock panel') : this.props.t('Unlock panel'),
        icon: this.props.editable ? 'unlock' : 'lock',
      },
      {
        onClick: this.handleRefreshGameDialog,
        onContextMenu: gameReload,
        label: this.props.t('Refresh game'),
        icon: 'refresh',
      },
    ]
    return (
      <PoiControlTag
        tag="poi-control"
        extend={this.state.extend}
        onTransitionEnd={this.handleTransitionEnd}
      >
        <PoiControlInner>{list.map(this.renderButton)}</PoiControlInner>
        <div>
          <Button
            icon={this.state.extend ? 'chevron-left' : 'chevron-right'}
            onClick={this.handleSetExtend}
            minimal
          />
        </div>
      </PoiControlTag>
    )
  }
}
