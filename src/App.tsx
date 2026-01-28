import { ThemeProvider } from './contexts/ThemeContext'
import { MapProvider } from './contexts/MapContext'
import Header from './components/Header'
import Map from './components/map/Map'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <MapProvider>
        <div className="w-screen h-screen flex flex-col">
          <Header />
          <div className="flex-1 pt-14">
            <Map className="w-full h-full" />
          </div>
        </div>
      </MapProvider>
    </ThemeProvider>
  )
}

export default App
