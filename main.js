


const { app, BrowserWindow, Menu } = require('electron')



let win

function createWindow() {

  win = new BrowserWindow({
    width: 800,
    height: 600,
    minHeight: 240,
    minWidth: 300,
    webPreferences: {
      nodeIntegration: true
    }
  })


  win.loadFile('index.html')



  win.webContents.openDevTools()


  win.on('closed', () => {



    win = null
  })
}




app.on('ready', createWindow)


app.on('window-all-closed', () => {


  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {


  if (win === null) {
    createWindow()
  }
})



const template = [
  {
    label: 'File',
    submenu: [
      {
        label: "Open",
        click() {
          win.webContents.send('action', 'open');
        },
        accelerator: 'CmdOrCtrl+O'
      },

    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
