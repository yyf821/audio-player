
const fs = require('fs')
const path = require('path')
const { ipcRenderer, remote } = require('electron'),
    dialog = remote.dialog,
    WIN = remote.getCurrentWindow()

const log = console.log.bind(console)

const appendHtml = (element, html) => element.insertAdjacentHTML('beforeend', html)

// 把 fs.readdir 封装成 promise 的形式, 方便使用
const readdir = (path) => {
    let p = new Promise((resolve, reject) => {
        fs.readdir(path, (error, files) => {
            if (error !== null) {
                reject(error)
            } else {
                resolve(files)
            }
        })
    })
    return p
}

const e = (selector) => document.querySelector(selector)

const es = selector => document.querySelectorAll(selector)

const templateAudio = (audio, pathname) => {
    let src = path.join(pathname, audio)
    let t = `
        <li class="gua-song one-line" data-href="${src}">
            <span class="song-title">${audio}</span>
        </li>
    `
    return t
}

const insertAudio = (audio, pathname) => {
    let container = e('#id-ul-song-list')
    let html = templateAudio(audio, pathname)
    appendHtml(container, html)
}

const insertAudios = (audios, pathname) => {
    for (let a of audios) {
        insertAudio(a, pathname)
    }
}

const loadAudio = (dir) => {
    let pathname = dir[0]
    readdir(pathname).then((files) => {
        let audios = files.filter((e) => e.endsWith('.mp3'))
        insertAudios(audios, pathname)
    })
}

const actionPlay = (player, el) => {
    let href = el.dataset.href
    player.src = href
    showCurrentTime(player)
    playSong(player)
}

const playSong = function (player) {
    player.play()
    $("#icon-play").hide()
    $("#icon-pause").show();
}

const choice = function (array) {
    let a = Math.random()
    a = a * array.length
    let index = Math.floor(a)
    e('#id-audio-player').setAttribute("data-cur", index);
    return array[index]
}

const randomSong = function () {
    let songs = allSongs()
    let s = choice(songs)
    return s
}


const actionEnded = (audio, mode) => {
    if (mode === 'loop') {
        audio.play()
    } else if (mode === 'random') {
        let song = randomSong()
        audio.src = song
        audio.play()
    } else {
        let song = nextSong(audio)
        audio.src = song
        audio.play()
    }
    let index = Number(audio.dataset.cur)
    let el = es("#id-ul-song-list li")[index]
    active(el)
}

const openDir = function () {
    //监听与主进程的通信
    ipcRenderer.on('action', (event, arg) => {
        switch (arg) {
            case 'open': //打开文件
                let options = { properties: ["openDirectory"] }
                let dir = dialog.showOpenDialog(options)
                if (dir) {
                    loadAudio(dir)
                }
                break;
        }
    });
}

const toggleAudio = function (audio) {
    let button = e('#id-button-play')
    button.addEventListener('click', function () {
        if (audio.paused) {
            playSong(audio)
        } else {
            audio.pause()
            toggleMessage('暂停')
            $("#icon-play").show()
            $("#icon-pause").hide();
        }
    })
}

const toggleList = function () {
    let button = e('#id-button-menu')
    button.addEventListener('click', function () {
        let el = $('.div-list')
        if (el.is(":visible")) {
            el.hide()
            WIN.setSize(400, 240)
        } else {
            el.show()
            WIN.setSize(800, 600)
        }
    })
}

const toggleMode = function (audio) {
    let button = e('#id-button-mode')
    button.addEventListener('click', function () {
        let mode = audio.dataset.mode
        if (mode === 'loop') {
            mode = "random"
            toggleMessage('随机播放')
            button.innerHTML = '<i class="zmdi zmdi-shuffle"></i>'
        } else if (mode === 'random') {
            mode = "forward"
            toggleMessage('列表循环')
            button.innerHTML = '<i class="zmdi zmdi-repeat"></i>'
        } else {
            mode = "loop"
            toggleMessage('单曲循环')
            button.innerHTML = '<i class="zmdi zmdi-repeat-one"></i>'
        }
        audio.setAttribute("data-mode", mode);
        
    })
}

const toggleMute = function (audio) {
    let button = e('#id-button-mute')
    button.addEventListener('click', function () {
        if (audio.muted) {
            audio.muted = false
            $("#icon-vol-mute").hide()
            $("#icon-vol-up").show();
        } else {
            audio.muted = true;
            $("#icon-vol-mute").show()
            $("#icon-vol-up").hide();
        }
    })
}

const toggleMessage = function (msg) {
    let text = e(".title").dataset.title
    $(".title").text(msg)
    setTimeout(function () {
        $(".title").text(text)
    }, 1000);
}

const timeFormat = function (time) {
    let m = Math.floor(time / 60)
    let s = time % 60
    let strM = String(m).length === 1 ? '0' + m : String(m)
    let strS = String(s).length === 1 ? '0' + s : String(s)
    return `${strM}:${strS}`
}

const showCurrentTime = function (audio) {
    let bar = e('.inner')
    audio.addEventListener("durationchange", function () {
        // 可以显示播放时长了
        let duration = parseInt(audio.duration, 10)
        $('#id-span-duration').text(timeFormat(duration));
    });
    audio.addEventListener('timeupdate', function () {
        //设置进度条
        let current = parseInt(audio.currentTime, 10)
        $('#id-span-current').text(timeFormat(current));
        bar.style.width = parseInt(((audio.currentTime / audio.duration) * 100), 10) + "%";
    });
}

const active = function (el) {
    let active = e('.active')
    if (active) {
        active.classList.remove('active')
    }
    el.classList.add('active')
    let text = el.textContent;
    $(".title").attr('data-title', text);
    $(".title").text(text);
}

const bindEventPlay = (player) => {
    let container = e('#id-ul-song-list')
    container.addEventListener('click', (event) => {
        let self = event.target
        let el = self.closest("li")
        let index = $("#id-ul-song-list li").index(el);
        player.setAttribute("data-cur", index);
        active(el)
        actionPlay(player, el)
    })
}

const bindEventEnded = (player) => {
    player.addEventListener('ended', (event) => {
        let mode = player.dataset.mode
        actionEnded(player, mode)
    })
}

//进度条拖动
const progressControl = (player) => {
    let inner = e('.inner')
    let outer = e('.outer')
    let dot = e('.dot')
    let max = outer.offsetWidth
    let moving = false
    let offset = 0
    window.onresize = () => {
        max = outer.offsetWidth
    }

    dot.addEventListener('mousedown', (event) => {
        if (player.src) {
            offset = event.clientX - dot.offsetLeft
            moving = true
        }
    })

    document.addEventListener('mouseup', (event) => {
        moving = false
    })

    document.addEventListener('mousemove', (event) => {
        if (moving) {
            // 离浏览器左侧窗口当前距离减去父元素距离浏览器左侧窗口距离就是
            // dot 移动的距离
            let x = event.clientX - offset
            if (x > max) {
                x = max
            }
            if (x < 0) {
                x = 0
            }
            let width = (x / max) * 100
            inner.style.width = String(width) + '%'
            player.currentTime = player.duration * (x / max)
        }
    })
}

const allSongs = function () {
    let musics = es('.gua-song')
    let songs = []
    for (let i = 0; i < musics.length; i++) {
        let m = musics[i]
        let path = m.dataset.href
        songs.push(path)
    }
    return songs
}

const nextSong = function (audio) {
    let songs = allSongs()
    let index = Number(audio.dataset.cur)
    index = (index + 1) % songs.length
    audio.setAttribute("data-cur", index);
    return songs[index]
}

const prevSong = function (audio) {
    let songs = allSongs()
    let index = Number(audio.dataset.cur)
    index = (index - 1 + songs.length) % songs.length
    audio.setAttribute("data-cur", index);
    return songs[index]
}

const bindEventNext = function (audio) {
    let button = e('#id-button-next')
    button.addEventListener('click', function () {
        let song = nextSong(audio)
        if (!song) {
            return
        }
        audio.src = song
        playSong(audio)
        let index = Number(audio.dataset.cur)
        let el = es("#id-ul-song-list li")[index]
        active(el)
    })

}

const bindEventPrev = function (audio) {
    let button = e('#id-button-prev')
    button.addEventListener('click', function () {
        let song = prevSong(audio)
        if (!song) {
            return
        }
        audio.src = song
        playSong(audio)
        let index = Number(audio.dataset.cur)
        let el = es("#id-ul-song-list li")[index]
        active(el)
    })
}

const bindEventSpeedup = function (audio) {
    let button = e('#id-button-speedup')
    button.addEventListener('click', function () {
        if (audio.playbackRate < 2) {
            audio.playbackRate += 0.25
            toggleMessage('播放速度：' + audio.playbackRate)
        }
    })
}

const bindEventSlow = function (audio) {
    let button = e('#id-button-slowdown')
    button.addEventListener('click', function () {
        if (audio.playbackRate > 0.5) {
            audio.playbackRate -= 0.25
            toggleMessage('播放速度：' + audio.playbackRate)
        }
    })
}

const bindEvents = () => {
    let player = e('#id-audio-player')

    bindEventPlay(player)
    bindEventEnded(player)
    progressControl(player)
    toggleAudio(player)
    toggleMute(player)
    toggleMode(player)
    bindEventNext(player)
    bindEventPrev(player)
    bindEventSpeedup(player)
    bindEventSlow(player)
    toggleList()
}

const __main = () => {
    bindEvents()
    openDir()
}

__main()
