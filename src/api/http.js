import axios from 'axios'

export function createHttp({ baseURL, headers }) {
  return axios.create({
    baseURL,
    headers,
    timeout: 30_000,
  })
}

const http = axios.create({
  timeout: 30_000,
})

export default http
