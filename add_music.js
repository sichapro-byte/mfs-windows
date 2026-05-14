import fs from 'fs';

let ts = fs.readFileSync('index.ts', 'utf8');

const target1 = `function initSubwaySurfer(windowEl: HTMLDivElement) {`;

const repl1 = `
let surferBgmPlayer: any = null;
let bgmInitialized = false;

async function initSurferBgmLayer() {
    if (bgmInitialized) return;
    try {
        await loadYouTubeApi();
        // @ts-ignore
        surferBgmPlayer = new YT.Player('subwaysurfer-bgm', {
            height: '10',
            width: '10',
            videoId: 'YmlePfb1a8k',
            playerVars: {
                'playsinline': 1,
                'autoplay': 0,
                'loop': 1,
                'playlist': 'YmlePfb1a8k'
            },
            events: {
                'onReady': () => { bgmInitialized = true; }
            }
        });
    } catch(err) {
        console.error("Failed to load BGM array", err);
    }
}

function initSubwaySurfer(windowEl: HTMLDivElement) {
    initSurferBgmLayer();
`;

ts = ts.replace(target1, repl1);

const target2 = `    function reset() {`;

const repl2 = `    function reset() {
        if (surferBgmPlayer && typeof surferBgmPlayer.playVideo === 'function') {
            surferBgmPlayer.playVideo();
        }`;

ts = ts.replace(target2, repl2);

const target3 = `                    playing = false;`;

const repl3 = `                    playing = false;
                    if (surferBgmPlayer && typeof surferBgmPlayer.pauseVideo === 'function') {
                        surferBgmPlayer.pauseVideo();
                    }`;

ts = ts.replace(target3, repl3);


fs.writeFileSync('index.ts', ts);
console.log('done modifying typescript for music');
