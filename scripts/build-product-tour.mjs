import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryDirectory = mkdtempSync(resolve(tmpdir(), "haccora-product-tour-"));
const temporaryVideo = resolve(temporaryDirectory, "haccora-product-tour.mp4");
const temporaryPoster = resolve(temporaryDirectory, "haccora-product-tour-poster.jpg");
const outputVideo = resolve(repositoryRoot, "public/media/haccora-product-tour.mp4");
const outputPoster = resolve(repositoryRoot, "public/media/haccora-product-tour-poster.jpg");

const assets = [
  "src/assets/hero-chef.jpg",
  "src/assets/screenshot-home.jpg",
  "src/assets/screenshot-today.jpg",
  "src/assets/screenshot-temperature.jpg",
  "src/assets/mobile-temperature.jpg",
  "src/assets/screenshot-diary.jpg",
  "src/assets/mobile-diary.jpg",
  "src/assets/screenshot-inspection.jpg",
].map((asset) => resolve(repositoryRoot, asset));

const boldFont = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const regularFont = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const sceneDuration = 6;
const transitionDuration = 0.6;

const title = (text, y, size = 42) =>
  `drawtext=fontfile=${boldFont}:text='${text}':fontcolor=white:fontsize=${size}:x=58:y=${y}`;
const copy = (text, y, size = 21, colour = "white@0.76") =>
  `drawtext=fontfile=${regularFont}:text='${text}':fontcolor=${colour}:fontsize=${size}:x=58:y=${y}`;
const brand = (step) =>
  [
    "drawbox=x=0:y=0:w=1280:h=10:color=#18a34a:t=fill",
    `drawtext=fontfile=${boldFont}:text='HACCORA':fontcolor=white:fontsize=23:x=58:y=45`,
    `drawtext=fontfile=${regularFont}:text='SAFE  CLEAN  TRACEABLE':fontcolor=white@0.55:fontsize=10:x=58:y=76`,
    `drawbox=x=58:y=116:w=58:h=29:color=#c8102e:t=fill`,
    `drawtext=fontfile=${boldFont}:text='${step}':fontcolor=white:fontsize=14:x=76:y=123`,
  ].join(",");

const filters = [
  // Opening: a confident real-kitchen image and a concise product promise.
  `[0:v]scale=1380:1035,crop=1280:720:50:140,setsar=1,format=yuv420p,trim=duration=${sceneDuration},setpts=PTS-STARTPTS,` +
    "drawbox=x=0:y=0:w=1280:h=720:color=black@0.58:t=fill," +
    "drawbox=x=0:y=0:w=17:h=720:color=#c8102e:t=fill," +
    "drawbox=x=17:y=0:w=7:h=720:color=#18a34a:t=fill," +
    `drawtext=fontfile=${boldFont}:text='HACCORA':fontcolor=white:fontsize=30:x=70:y=62,` +
    `drawtext=fontfile=${regularFont}:text='SAFE  CLEAN  TRACEABLE':fontcolor=white@0.7:fontsize=12:x=70:y=102,` +
    title("Food safety", 238, 62) +
    "," +
    title("under control.", 312, 62) +
    "," +
    copy("Clear daily work. Reliable records. Less paperwork.", 402, 24) +
    "," +
    `drawbox=x=70:y=490:w=248:h=51:color=#c8102e@0.96:t=fill,` +
    `drawtext=fontfile=${boldFont}:text='SEE THE WORKFLOW':fontcolor=white:fontsize=16:x=96:y=507[intro]`,

  // Marketing overview.
  `[1:v]scale=830:-1,setsar=1[homeScreen];` +
    `color=c=#0b0b0d:s=1280x720:d=${sceneDuration},format=yuv420p,` +
    `${brand("01")},` +
    title("One clear", 211) +
    "," +
    title("workspace", 263) +
    "," +
    copy("Everything your team needs", 340) +
    "," +
    copy("without hunting through paper.", 371) +
    ",drawbox=x=382:y=137:w=850:h=395:color=black@0.48:t=fill[homeBase];" +
    `[homeBase][homeScreen]overlay=392:147:shortest=1,trim=duration=${sceneDuration},setpts=PTS-STARTPTS[home]`,

  // Shift workflow.
  `[2:v]scale=830:-1,setsar=1[todayScreen];` +
    `color=c=#101012:s=1280x720:d=${sceneDuration},format=yuv420p,` +
    `${brand("02")},` +
    title("Run every", 211) +
    "," +
    title("shift clearly", 263) +
    "," +
    copy("Open. Monitor. Close.", 340) +
    "," +
    copy("Priorities stay visible to the team.", 371) +
    ",drawbox=x=382:y=112:w=850:h=474:color=black@0.48:t=fill[todayBase];" +
    `[todayBase][todayScreen]overlay=392:122:shortest=1,trim=duration=${sceneDuration},setpts=PTS-STARTPTS[today]`,

  // Temperature evidence with a mobile companion screen.
  `[3:v]scale=820:-1,setsar=1[tempScreen];` +
    `[4:v]scale=164:-1,setsar=1[tempPhone];` +
    `color=c=#0b0b0d:s=1280x720:d=${sceneDuration},format=yuv420p,` +
    `${brand("03")},` +
    title("Temperatures", 211) +
    "," +
    title("with evidence", 263) +
    "," +
    copy("Targets, exceptions and actions", 340) +
    "," +
    copy("stay connected to each reading.", 371) +
    ",drawbox=x=382:y=112:w=840:h=474:color=black@0.48:t=fill[tempBase];" +
    `[tempBase][tempScreen]overlay=392:122:shortest=1[tempDesktop];` +
    `[tempDesktop]drawbox=x=1037:y=279:w=184:h=377:color=black@0.58:t=fill[tempShadow];` +
    `[tempShadow][tempPhone]overlay=1047:289:shortest=1,trim=duration=${sceneDuration},setpts=PTS-STARTPTS[temp]`,

  // Diary and manager sign-off.
  `[5:v]scale=820:-1,setsar=1[diaryScreen];` +
    `[6:v]scale=164:-1,setsar=1[diaryPhone];` +
    `color=c=#101012:s=1280x720:d=${sceneDuration},format=yuv420p,` +
    `${brand("04")},` +
    title("Close the", 211) +
    "," +
    title("loop daily", 263) +
    "," +
    copy("Record problems, corrective actions", 340) +
    "," +
    copy("and manager sign-off in one place.", 371) +
    ",drawbox=x=382:y=112:w=840:h=474:color=black@0.48:t=fill[diaryBase];" +
    `[diaryBase][diaryScreen]overlay=392:122:shortest=1[diaryDesktop];` +
    `[diaryDesktop]drawbox=x=1037:y=279:w=184:h=377:color=black@0.58:t=fill[diaryShadow];` +
    `[diaryShadow][diaryPhone]overlay=1047:289:shortest=1,trim=duration=${sceneDuration},setpts=PTS-STARTPTS[diary]`,

  // Inspection view.
  `[7:v]scale=830:-1,setsar=1[inspectionScreen];` +
    `color=c=#0b0b0d:s=1280x720:d=${sceneDuration},format=yuv420p,` +
    `${brand("05")},` +
    title("Share scoped", 211) +
    "," +
    title("evidence", 263) +
    "," +
    copy("A focused, read-only inspection view", 340) +
    "," +
    copy("for the period and records selected.", 371) +
    ",drawbox=x=382:y=112:w=850:h=474:color=black@0.48:t=fill[inspectionBase];" +
    `[inspectionBase][inspectionScreen]overlay=392:122:shortest=1,trim=duration=${sceneDuration},setpts=PTS-STARTPTS[inspection]`,

  // Closing card.
  `color=c=#09090a:s=1280x720:d=${sceneDuration},format=yuv420p,` +
    "drawbox=x=0:y=0:w=1280:h=14:color=#18a34a:t=fill," +
    "drawbox=x=876:y=0:w=404:h=720:color=#c8102e:t=fill," +
    `drawtext=fontfile=${boldFont}:text='HACCORA':fontcolor=white:fontsize=62:x=74:y=182,` +
    `drawtext=fontfile=${regularFont}:text='SAFE  CLEAN  TRACEABLE':fontcolor=#42d37a:fontsize=18:x=78:y=263,` +
    `drawtext=fontfile=${boldFont}:text='Food safety. Clear evidence.':fontcolor=white:fontsize=35:x=74:y=360,` +
    `drawtext=fontfile=${boldFont}:text='Less paperwork.':fontcolor=white:fontsize=35:x=74:y=410,` +
    `drawtext=fontfile=${regularFont}:text='Structured for food businesses':fontcolor=white@0.7:fontsize=21:x=78:y=495,` +
    `drawtext=fontfile=${regularFont}:text='in the United Kingdom.':fontcolor=white@0.7:fontsize=21:x=78:y=527,` +
    `drawtext=fontfile=${boldFont}:text='START':fontcolor=white@0.35:fontsize=82:x=963:y=288,` +
    `drawtext=fontfile=${boldFont}:text='CLEAR':fontcolor=white:fontsize=48:x=954:y=375,trim=duration=${sceneDuration},setpts=PTS-STARTPTS[outro]`,

  // Smooth, restrained transitions keep the product legible.
  `[intro][home]xfade=transition=fade:duration=${transitionDuration}:offset=5.4[x1];` +
    `[x1][today]xfade=transition=fade:duration=${transitionDuration}:offset=10.8[x2];` +
    `[x2][temp]xfade=transition=fade:duration=${transitionDuration}:offset=16.2[x3];` +
    `[x3][diary]xfade=transition=fade:duration=${transitionDuration}:offset=21.6[x4];` +
    `[x4][inspection]xfade=transition=fade:duration=${transitionDuration}:offset=27.0[x5];` +
    `[x5][outro]xfade=transition=fade:duration=${transitionDuration}:offset=32.4,format=yuv420p[video]`,
].join(";");

const inputArguments = assets.flatMap((asset) => [
  "-loop",
  "1",
  "-t",
  String(sceneDuration),
  "-i",
  asset,
]);
const videoResult = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "warning",
    ...inputArguments,
    "-filter_complex",
    filters,
    "-map",
    "[video]",
    "-an",
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "20",
    "-profile:v",
    "high",
    "-level",
    "4.0",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    temporaryVideo,
  ],
  { encoding: "utf8" },
);

if (videoResult.status !== 0) {
  rmSync(temporaryDirectory, { recursive: true, force: true });
  throw new Error(videoResult.stderr || "ffmpeg failed to build the Haccora product tour");
}

const posterResult = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "warning",
    "-ss",
    "1.8",
    "-i",
    temporaryVideo,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    temporaryPoster,
  ],
  { encoding: "utf8" },
);

if (posterResult.status !== 0) {
  rmSync(temporaryDirectory, { recursive: true, force: true });
  throw new Error(posterResult.stderr || "ffmpeg failed to build the Haccora product-tour poster");
}

renameSync(temporaryVideo, outputVideo);
copyFileSync(temporaryPoster, outputPoster);
rmSync(temporaryDirectory, { recursive: true, force: true });

console.log("Built public/media/haccora-product-tour.mp4 and its poster.");
