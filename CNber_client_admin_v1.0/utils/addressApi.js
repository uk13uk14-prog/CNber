import { request } from './request.js'

export function lookupAddressByPostcode(postcode, config = {}) {
  return request({
    url: '/address/lookup',
    method: 'GET',
    data: {
      postcode: String(postcode || '').trim()
    },
    ...config
  })
}

export function searchAddressesByPostcode(postcode) {
  return request({
    url: '/address/search',
    method: 'GET',
    data: {
      postcode: String(postcode || '').trim()
    }
  })
}
