export type Locale = 'en' | 'bn';

export const COPY = {
  en: {
    brand: 'FlappyML Studio',
    nav: {
      arena: 'Arena',
      neural: 'Neural Net',
      progress: 'Score Curve',
      exportBot: 'Website Bot',
    },
    topCta: 'Get Website Bot',
    heroTitle: 'Autonomous Neuroevolution Bot for Flappy Bird',
    heroSubtitle:
      'Train a 5-6-1 neural network population in real time, inspect live synaptic decisions, and deploy the trained bot onto any Flappy Bird website.',
    modes: {
      train: 'Train Population',
      champion: 'Champion Autopilot',
      human: 'Human Play',
    },
    controls: {
      play: 'Resume',
      pause: 'Pause',
      reset: 'Reset Training',
      loadChampion: 'Load Pre-Trained Brain',
      speed: 'Speed',
      theme: 'Theme',
      themes: {
        daylight: 'Daylight',
        dusk: 'Dusk',
        midnight: 'Midnight',
      },
      sensors: 'Sensor Rays',
      soundOn: 'Sound On',
      soundOff: 'Muted',
      population: 'Population',
      mutationRate: 'Mutation Rate',
      pipeGap: 'Pipe Gap',
    },
    kpis: {
      generation: 'Generation',
      alive: 'Birds Alive',
      currentScore: 'Current Score',
      bestAllTime: 'Best Score',
    },
    canvas: {
      score: 'Score',
      clickToFlap: 'Press Space or Click anywhere on the sky to flap',
      gameOver: 'Run Complete',
      playAgain: 'Play Again',
      visionLock: 'Vision',
    },
    neural: {
      title: 'Live Neural Inspector',
      inputs: ['Bird Y', 'Velocity', 'Pipe Dist', 'Gap Delta', 'Lip Margin'],
      hiddenLayer: 'Hidden Layer (tanh)',
      outputLabel: 'Flap Trigger',
      flapState: 'FLAP',
      glideState: 'GLIDE',
    },
    chart: {
      title: 'Score Evolution Across Generations',
      bestScore: 'Best Score',
      avgScore: 'Average Score',
      emptyState: 'Complete 2 generations in Train mode to plot the learning curve.',
      generationPrefix: 'Gen',
    },
    exporter: {
      sectionTitle: 'Add Bot to Any Website',
      sectionSubtitle:
        'Deploy your active neural network weights onto external Flappy Bird websites. The injected bot scans game canvas pixels in real time, self-calibrates physics across retries, and plays automatically.',
      brainSource: 'Exported Weights',
      pretrainedSource: 'Verified Pre-Trained Champion (160+ Score)',
      evolvedSource: 'Your Evolved Champion',
      testVisionBtn: 'Test Pixel-Vision Overlay',
      testVisionActiveBtn: 'Hide Pixel-Vision Overlay',
      tabs: {
        bookmarklet: 'Bookmarklet',
        console: 'Console Script',
        userscript: 'Tampermonkey',
        embed: 'HTML Embed',
      },
      bookmarkletTitle: 'One-Click Bookmarklet (Fastest)',
      bookmarkletDesc:
        'Drag the green button below onto your browser Bookmarks Bar. Visit any Flappy Bird website and click the bookmark to launch the floating AI bot controller.',
      bookmarkletDragLabel: 'FlappyML AutoBot',
      copyBookmarklet: 'Copy Bookmarklet URL',
      consoleTitle: 'Browser Console Script',
      consoleDesc:
        'Open the target game website, press F12 (or Ctrl+Shift+J) to open the Console, paste this script, and press Enter.',
      userscriptTitle: 'Tampermonkey / Violentmonkey Userscript',
      userscriptDesc:
        'Download and install this .user.js file in Tampermonkey so the bot attaches automatically whenever you open matching game websites.',
      downloadUserscript: 'Download .user.js',
      embedTitle: 'HTML <script> Tag for Website Owners',
      embedDesc:
        'Add this self-contained script before the closing </body> tag of your own website to provide an automatic ML player.',
      copyCode: 'Copy Script',
      copied: 'Copied',
      howItWorksTitle: 'How the Universal Web Bot Plays Anywhere',
      features: [
        {
          title: 'Dual SVG/DOM & Canvas Vision',
          desc: 'Natively reads SVG/DOM stages (like quest.feather.games) with sub-pixel accuracy, and falls back to real-time <canvas> pixel scanning for any other Flappy Bird site.',
        },
        {
          title: 'Embedded Neuroevolution Brain',
          desc: 'Runs the exact 5-6-1 neural network weights trained in this studio at 60 FPS inside a lightweight 5 KB zero-dependency loop.',
        },
        {
          title: 'Online Physics Self-Calibration',
          desc: 'Different websites use different gravity and jump speeds. When a crash occurs, the bot detects whether it hit high or low, tunes its flap bias automatically, and restarts with Space/Click.',
        },
        {
          title: 'Draggable Floating Mini-Controller',
          desc: 'Appears on the target page so you can pause, pick a specific canvas, toggle the computer-vision debug boxes, or fine-tune sensitivity anytime.',
        },
      ],
    },
    storageNote: 'Training progress and champion weights are saved automatically in this browser.',
  },
  bn: {
    brand: 'FlappyML Studio',
    nav: {
      arena: 'গেম এরিনা',
      neural: 'নিউরাল নেট',
      progress: 'স্কোর গ্রাফ',
      exportBot: 'ওয়েবসাইট বট',
    },
    topCta: 'ওয়েবসাইট বট নিন',
    heroTitle: 'ফ্ল্যাপি বার্ড অটোনোমাস মেশিন লার্নিং বট',
    heroSubtitle:
      'রিয়েল-টাইমে নিউরোইভোলিউশন দিয়ে এআই বট ট্রেনিং করুন, লাইভ নিউরাল ডিসিশন দেখুন এবং যেকোনো ফ্ল্যাপি বার্ড ওয়েবসাইটে সহজে যুক্ত করুন।',
    modes: {
      train: 'বট ট্রেনিং (ML)',
      champion: 'চ্যাম্পিয়ন অটোপাইলট',
      human: 'নিজে খেলুন',
    },
    controls: {
      play: 'চালু করুন',
      pause: 'বিরতি',
      reset: 'নতুন ট্রেনিং',
      loadChampion: 'প্রি-ট্রেইনড ব্রেইন লোড',
      speed: 'স্পিড',
      theme: 'থিম',
      themes: {
        daylight: 'দিন',
        dusk: 'সন্ধ্যা',
        midnight: 'রাত',
      },
      sensors: 'সেন্সর লাইন',
      soundOn: 'সাউন্ড চালু',
      soundOff: 'মিউট',
      population: 'পাখির সংখ্যা',
      mutationRate: 'মিউটেশন রেট',
      pipeGap: 'পাইপের গ্যাপ',
    },
    kpis: {
      generation: 'জেনারেশন',
      alive: 'বেঁচে আছে',
      currentScore: 'বর্তমান স্কোর',
      bestAllTime: 'সর্বোচ্চ স্কোর',
    },
    canvas: {
      score: 'স্কোর',
      clickToFlap: 'উড়তে Space চাপুন বা ক্যানভাসে ক্লিক করুন',
      gameOver: 'খেলা শেষ',
      playAgain: 'আবার খেলুন',
      visionLock: 'ভিশন',
    },
    neural: {
      title: 'লাইভ নিউরাল নেটওয়ার্ক',
      inputs: ['উচ্চতা (Y)', 'গতি (Vy)', 'দূরত্ব', 'গ্যাপ গড়', 'নিচের ফাঁক'],
      hiddenLayer: 'হিডেন লেয়ার (tanh)',
      outputLabel: 'ফ্ল্যাপ সিদ্ধান্ত',
      flapState: 'FLAP',
      glideState: 'GLIDE',
    },
    chart: {
      title: 'জেনারেশন অনুযায়ী স্কোর উন্নতি',
      bestScore: 'সর্বোচ্চ স্কোর',
      avgScore: 'গড় স্কোর',
      emptyState: 'স্কোর উন্নতির গ্রাফ দেখতে অন্তত ২টি জেনারেশন সম্পূর্ণ হতে দিন।',
      generationPrefix: 'Gen',
    },
    exporter: {
      sectionTitle: 'যেকোনো ওয়েবসাইটে বট যুক্ত করুন',
      sectionSubtitle:
        'আপনার ট্রেনিং করা নিউরাল নেটওয়ার্ক বটটি যেকোনো ফ্ল্যাপি বার্ড ওয়েবসাইটে চালান। এটি গেমের স্ক্রিন স্ক্যান করে নিজেই বাধা শনাক্ত করে এবং স্কোর বাড়াতে ফিজিক্স অ্যাডজাস্ট করে নেয়।',
      brainSource: 'ব্যবহৃত ব্রেইন',
      pretrainedSource: 'প্রি-ট্রেইনড চ্যাম্পিয়ন (১৬০+ স্কোর)',
      evolvedSource: 'আপনার ট্রেনিং করা চ্যাম্পিয়ন',
      testVisionBtn: 'পিক্সেল-ভিশন টেস্ট করুন',
      testVisionActiveBtn: 'ভিশন ওভারলে বন্ধ করুন',
      tabs: {
        bookmarklet: 'বুকমার্কলেট',
        console: 'কনসোল স্ক্রিপ্ট',
        userscript: 'Tampermonkey',
        embed: 'HTML এমবেড',
      },
      bookmarkletTitle: 'ওয়ান-ক্লিক বুকমার্কলেট (সবচেয়ে সহজ)',
      bookmarkletDesc:
        'নিচের সবুজ বাটনটি ড্র্যাগ করে ব্রাউজারের Bookmarks Bar-এ রেখে দিন। এরপর যেকোনো ফ্ল্যাপি বার্ড ওয়েবসাইটে গিয়ে বুকমার্কটিতে ক্লিক করলেই অটো-বট চালু হয়ে যাবে।',
      bookmarkletDragLabel: 'FlappyML AutoBot',
      copyBookmarklet: 'বুকমার্কলেট লিংক কপি',
      consoleTitle: 'ব্রাউজার কনসোল স্ক্রিপ্ট',
      consoleDesc:
        'যেকোনো গেম ওয়েবসাইটে গিয়ে F12 (বা Ctrl+Shift+J) চেপে Console খুলুন, এই কোডটি পেস্ট করে Enter চাপুন।',
      userscriptTitle: 'Tampermonkey অটো-রান স্ক্রিপ্ট',
      userscriptDesc:
        '.user.js ফাইলটি ডাউনলোড করে Tampermonkey এক্সটেনশনে সেভ করলে গেম সাইটে ঢুকলেই বট অটোমেটিক চালু হবে।',
      downloadUserscript: '.user.js ডাউনলোড',
      embedTitle: 'নিজের ওয়েবসাইটে যোগ করার <script> কোড',
      embedDesc:
        'আপনার নিজের ওয়েবসাইটের </body> ট্যাগের আগে এই কোডটি বসিয়ে দিলে ভিজিটররা অটো-বট ব্যবহার করতে পারবে।',
      copyCode: 'কোড কপি করুন',
      copied: 'কপি হয়েছে',
      howItWorksTitle: 'বটটি যেভাবে যেকোনো ওয়েবসাইটে কাজ করে',
      features: [
        {
          title: 'SVG/DOM ও Canvas ডুয়াল ভিশন',
          desc: 'quest.feather.games-এর মতো SVG/DOM গেম থেকে সরাসরি নিখুঁত পজিশন পড়ে নেয়, এবং অন্যান্য HTML5 <canvas> সাইটে রিয়েল-টাইম পিক্সেল স্ক্যানিং ব্যবহার করে।',
        },
        {
          title: 'নিউরোইভোলিউশন ব্রেইন',
          desc: 'এখানে ট্রেনিং করা ৫-৬-১ নিউরাল নেটওয়ার্কের ওয়েটগুলো সরাসরি স্ক্রিপ্টের ভেতর থাকে, কোনো এক্সটার্নাল সার্ভার লাগে না।',
        },
        {
          title: 'অটো-টিউন ও অটো-রিস্টার্ট',
          desc: 'অন্য ওয়েবসাইটের গ্র্যাভিটি বা স্পিড আলাদা হলে ক্র্যাশ করার পর বট নিজেই ফ্ল্যাপ বায়াস অ্যাডজাস্ট করে এবং Space/Click দিয়ে নতুন গেম শুরু করে।',
        },
        {
          title: 'ভাসমান কন্ট্রোল প্যানেল',
          desc: 'যেকোনো সাইটের কোণায় একটি ছোট কন্ট্রোল বক্স দেখা যাবে, যেখান থেকে Start/Pause, ক্যানভাস Pick ও সেন্সিটিভিটি কন্ট্রোল করা যাবে।',
        },
      ],
    },
    storageNote: 'আপনার ট্রেনিং ডাটা ও চ্যাম্পিয়ন ওয়েট ব্রাউজারে অটোমেটিক সংরক্ষিত থাকে।',
  },
} as const;
