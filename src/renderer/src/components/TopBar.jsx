function TopBar() {
    const handleMinimize = () => {
        window.electron.ipcRenderer.send('minimize-window')
    };
    const handleClose = () => {
        window.electron.ipcRenderer.send('close-window')
    };
    return (
        <div className="relative">
            <div className='bg-blue-400 w-full h-8 relative flex justify-end items-center rounded-t-xl' style={{ "webkitAppRegion": "drag" }}>
                <div id="controle-buttons" className="h-full flex items-center rounded-t-xl" style={{ "webkitAppRegion": "no-drag" }}>
                    <button id="minimize-button" onClick={handleMinimize} className="px-3 py-1 hover:bg-blue-500 h-full flex items-center cursor-pointer">&#128469;</button>
                    <button id="close-button" onClick={handleClose} className="px-3 py-1 hover:bg-red-500 h-full flex items-center cursor-pointer">&#10006;</button>
                </div>
            </div>
        </div>
    )
}

export default TopBar;