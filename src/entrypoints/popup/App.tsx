function useStorage<T>(key: string) {
  const [value, setValue] = useState<null | T>(null)
  useEffect(() => {
    const fetchStorageValue = async () => {
      const storedvalue = await storage.getItem<null | T>(key)
      setValue(storedvalue)
    }
    fetchStorageValue()
    const unwatch = storage.watch<T>(key, setValue)
    return unwatch
  }, [key])
  return value
}

function App() {
  const v0RateLimit = useStorage('local:v0RateLimit')
  const boltRateLimit = useStorage('local:boltRateLimit')

  return (
    <div>
      <h1>Rate Limit</h1>
      <pre>{JSON.stringify(v0RateLimit, null, 2)}</pre>
      <pre>{JSON.stringify(boltRateLimit, null, 2)}</pre>
    </div>
  )
}

export default App
