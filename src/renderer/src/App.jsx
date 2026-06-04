import TopBar from './components/TopBar'
import { useState } from 'react';
import Timer from './components/Timer';

function App() {
  //const ipcHandle = () => window.electron.ipcRenderer.send('ping')
const [isOverlay, setIsOverlay] = useState(false);
  return (
    <>
      <TopBar/>
      <div className='bg-black/40 p-2 rounded-b-xl '>
      <Timer isOverlay={isOverlay}/>
      </div>
    </>
  )
}

export default App;
