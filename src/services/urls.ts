/** Keep links inside this app's deployment path, including GitHub project Pages. */
export function appUrl(path = '/', base = import.meta.env.BASE_URL, origin = window.location.origin): URL {
  const url = new URL(base, origin)
  url.hash = path.startsWith('/') ? path : `/${path}`
  return url
}
