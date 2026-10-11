const requests = new Map<string, Promise<unknown>>()

export function loadJSON<T>(url: string): Promise<T> {
  let request = requests.get(url)
  if (!request) {
    request = fetch(url).then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
      return response.json()
    }).catch(error => { requests.delete(url); throw error })
    requests.set(url, request)
  }
  return request as Promise<T>
}
