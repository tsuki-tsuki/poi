import { reducer } from '../airbase'

// FIXME: cannot find a good fixture for createAPIReqMapNextResponseAction

import {
  createAPIGetMemberMapinfoResponseAction,
  createAPIReqAirCorpsSetPlaneResponseAction,
  createAPIReqAirCorpsChangeNameResponseAction,
  createAPIReqAirCorpsSetActionResponseAction,
  createAPIReqAirCorpsSupplyResponseAction,
  createAPIPortPortResponseAction,
} from '../../actions'

import mapInfoFixture from './__fixtures__/api_get_member_mapinfo.json'
import setPlaneFixture from './__fixtures__/api_req_air_corps_set_plane.json'
import changeNameFixture from './__fixtures__/api_req_air_corps_change_name.json'
import setActionFixture from './__fixtures__/api_req_air_corps_set_action.json'
import supplyFixture from './__fixtures__/api_req_air_corps_supply.json'

describe('airbase reduer', () => {
  const initialState = reducer([], createAPIGetMemberMapinfoResponseAction(mapInfoFixture))

  it('empty action', () => {
    // @ts-expect-error testing empty reducer
    expect(reducer(undefined, {})).toEqual([])
  })

  it('createAPIGetMemberMapinfoResponseAction', () => {
    // @ts-expect-error testing empty reducer
    expect(reducer([], createAPIGetMemberMapinfoResponseAction({ body: {} }))).toEqual([])

    expect(reducer([], createAPIGetMemberMapinfoResponseAction(mapInfoFixture))).toMatchSnapshot()
  })

  it('createAPIReqAirCorpsSetPlaneResponseAction', () => {
    expect(initialState).toMatchDiffSnapshot(
      reducer(initialState, createAPIReqAirCorpsSetPlaneResponseAction(setPlaneFixture)),
    )
  })

  it('createAPIReqAirCorpsChangeNameResponseAction', () => {
    expect(initialState).toMatchDiffSnapshot(
      reducer(initialState, createAPIReqAirCorpsChangeNameResponseAction(changeNameFixture)),
    )
  })

  it('createAPIReqAirCorpsSetActionResponseAction', () => {
    expect(initialState).toMatchDiffSnapshot(
      reducer(initialState, createAPIReqAirCorpsSetActionResponseAction(setActionFixture)),
    )
  })

  it('createAPIReqAirCorpsSupplyResponseAction', () => {
    expect(initialState).toMatchDiffSnapshot(
      reducer(initialState, createAPIReqAirCorpsSupplyResponseAction(supplyFixture)),
    )
  })

  it('createAPIPortPortResponseAction', () => {
    expect(initialState).toMatchDiffSnapshot(
      // @ts-expect-error testing empty reducer
      reducer(initialState, createAPIPortPortResponseAction({})),
    )
  })
})
