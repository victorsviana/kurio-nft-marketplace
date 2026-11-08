import axios from 'axios'
import { config } from '@/shared/config'

/**
 * Single Axios instance for every REST call (constitution §1).
 * Interceptors (session token, guest cart id, error normalization) are added in T2.4.
 */
export const http = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})
