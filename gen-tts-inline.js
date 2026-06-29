const path = require('path');
const fs = require('fs');
const ttsModule = require('./scripts/tts.js');

const WORKDIR = 'd:/TRAE SOLO/视频制作/test-dubbing/canvasvideo-workdir/cv_3be599_mqyloyld_a777ce18';

const script = `北京，这座古老又现代的城市，到底怎么玩？

首先，天安门广场是必打卡的地方。早上看升旗仪式，感受那份庄严。然后步行几分钟，就是故宫，这座世界最大的宫殿建筑群，建议预留三到四个小时，慢慢逛。

中午可以尝尝北京烤鸭。全聚德、大董都是老字号，但簋街的胡同小店也很有味道。

下午去颐和园，这是中国最大的皇家园林昆明湖边的十七孔桥，还有长廊，拍照特别出片。如果时间充裕，圆明园遗址也值得一看。

晚上，推荐去三里屯或者后海酒吧街，感受一下北京的夜生活。或者在前门大街逛逛，吃点老北京小吃，炸酱面、豆汁儿、焦圈，体验一下地道的京味。

第二天，可以去八达岭长城。都说不到长城非好汉，建议早点出发，避开人流。下午回来可以逛逛南锣鼓巷，这是老北京胡同的代表，有很多特色小店和文创产品。

最后提醒一下，北京的地铁很方便，下载亿通行可以直接刷手机。另外，住宿建议选在二环以内，去各个景点都近。祝你在北京玩得开心！`;

async function main() {
  const audioDir = path.join(WORKDIR, 'assets');
  const srtDir = path.join(WORKDIR, 'assets', 'subtitles');
  fs.mkdirSync(srtDir, { recursive: true });

  const [mp3Path, srtPath] = await ttsModule.textToAudioSrt({
    text: script,
    voice: 'zh-CN-YunxiNeural',
    audioDir,
    audioFileName: 'voice.mp3',
    srtDir,
    srtFileName: 'subtitle.srt',
    shortSubtitle: false,
  });

  console.log('完成！');
  console.log('音频:', mp3Path);
  console.log('字幕:', srtPath);
}

main().catch(console.error);