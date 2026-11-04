// ============================================================
// import-mecca.mjs — 把会长 mecca-eat 的 store.json 转成
// what-to-eat 的补充数据（只补缺失档口/菜品，不覆盖现有数据）
//
// 用法：
//   node tools/import-mecca.mjs "C:\path\to\store.json"
// 输出：
//   tools/staging/mecca-supplement.json  （已按本项目规则富化的菜品）
//   tools/staging/mecca-gap-report.json  （缺口与跳过明细，供核对）
//
// 范围：只取汇百味 / 北山苑的 food，不取商业街与饮料；
//       木里Mulee（4 道冰品）暂不纳入正餐池。
// ============================================================
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_JS = path.join(ROOT, "what-to-eat", "data", "data.js");
const OUT_SUPPLEMENT = path.join(ROOT, "tools", "staging", "mecca-supplement.json");
const OUT_REPORT = path.join(ROOT, "tools", "staging", "mecca-gap-report.json");
const STORE_PATH = process.argv[2];
if (!STORE_PATH || !fs.existsSync(STORE_PATH)) {
  console.error("用法：node tools/import-mecca.mjs <store.json 路径>");
  process.exit(1);
}

// ---------- 读取现有数据 ----------
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(DATA_JS, "utf8"), sandbox);
const ours = sandbox.window.DB_REAL.dishes.filter((d) => d.rawGroup !== "菜单补录");
const existingStall = new Map();
for (const d of ours) {
  // data.js 可能已经被 build-data 改过名；这里还原成采集时的档口名，保证去重基准稳定。
  let stall = d.stall;
  if (stall === "小火锅抄手水饺") stall = "抄手馄饨大王";
  else if (stall === "锅庐三汁焖锅" && /小锅/.test(d.name)) stall = "汤萌";
  if (!existingStall.has(stall)) existingStall.set(stall, { canteen: d.canteen, names: new Set(), loose: new Set() });
  existingStall.get(stall).names.add(normName(d.name));
  existingStall.get(stall).loose.add(looseName(d.name));
}

// ---------- 档口映射 ----------
// key 为会长的档口名（去掉食堂后缀），value 为本项目现有档口名；
// 未列出的视为新档口。
const STALL_MAP = {
  "叼馋柳州螺蛳粉": "柳州螺蛳粉",
  "惠芯意鲜抄手饺子": "惠芯意鲜饺坊",
  "犟稻酱骨饭": "犟稻超级酱骨饭",
  "興旺烧腊饭": "兴旺烧腊饭",
  "椒胖胖·擂椒拌饭": "擂椒拌饭",
  "朱家小馆辣肉面": "朱家小馆",
  "沈大爷拌饭拌面拌粉": "沈大爷",
  "川哥小炒": "川小炒哥炒饭",
  "烤肉饭": "烤肉饭",
  "西域烤肉饭自选烤盘饭": "西域烤肉饭·自选烤盘饭",
  "麻辣烫": "章尚村麻辣烫",
  "铁锅炖档口": "牛伯叔铁锅炖",
  "铁板木桶饭": "木桶饭",
  "小火锅抄手水饺": "抄手馄饨大王",
};
// 疑似同一档口被 OCR 拆成两家：按菜品分区归位，不合并档口名。
const SPLIT_STALL = {
  "锅炉三汁焖锅": (name) => (/小锅/.test(name) ? "汤萌" : "锅庐三汁焖锅"),
};
const SKIP_STALLS = new Set(["木里Mulee", "豆里拾光", "喜禾烘焙"]);

// ---------- 文本归一 ----------
function stripCanteen(s) {
  return (s || "").replace(/_(北山苑|汇百味|商业街)$/, "").replace(/北山苑|汇百味|商业街/g, "").trim();
}
const PROMO = /推荐|好吃|好评|学姐|学长|老板|发家|招牌|必点|现炒|新鲜|量多|肉多|香迷糊|跑不脱|勿拍|盲盒|特色|软糯|现包|新品|人气|爆款|回头客|力推|吃货|超值|优惠|活动|送|赞|收藏/;
function cleanName(raw) {
  let s = (raw || "")
    .replace(/【[^】]*】/g, "")
    .replace(/[【】]/g, "")
    .replace(/《[^》]*》/g, "")
    .replace(/[“"][^”"]*[”"]/g, "")
    .replace(/[（(][^）)]*[）)]/g, (m) => (PROMO.test(m) ? "" : m))
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2764\uFE0F]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/^(?:\(新\)|（新）|\[现包\]|新品[\/／]?)/, "").trim();
  s = s.replace(/[，,。；;、]+$/, "").trim();
  s = s.replace(/[+＋]?米饭一份$/, "").trim();
  return s;
}
function normName(s) {
  return (s || "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[，,。.！!、/／\s·\-—❤️]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "")
    .toLowerCase();
}
// 近似归一键：把“回锅肉盖饭 / 回锅肉炒饭 / 回锅肉”视为同一道菜，
// 只用于跳过已存在的近似项，不用于合并新档口内部的不同规格。
function looseName(s) {
  const first = (s || "").split(/[\/／]/)[0];
  return first
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/盖码饭|盖浇饭|盖饭|套饭|拌饭|炒饭|焖饭|套餐|焖锅|小锅|米饭一份|米饭|双拼|拼盘|任意|自选|大份|小份|中份|半份/g, "")
    .replace(/[，,。.！!、\s·\-—+＋]/g, "")
    .toLowerCase();
}
const PURE_DRINK = /^(可乐|雪碧|芬达|脉动|红牛|矿泉水|苏打水|王老吉|冰红茶|绿茶|奶茶|咖啡|果汁|酸奶|牛奶|豆浆|啤酒|酸梅汤|柠檬水|冰淇淋|甜筒|圣代)$/;
const NON_DISH = /^(米饭|白米饭|打包盒|餐盒|餐具|打包费|配送费|打包袋)$/;
const SKIP_NAME = /全场|加一份|加菜|加料|打包|餐盒|备注名细|小食拼盒|小食三拼|摇摇薯|饮料|^米饭$|^白米饭$|蘸料|打包费|配送费|老板|疯了|盲盒|福袋|随机/;
// 单点加料/配菜：只在家常菜档口算菜，出现在粉面/麻辣烫/煲类档口时不进正餐池。
const SIDE_ONLY = /^(羊肉|羊杂|鸭腿|虾滑|毛肚|黄喉|千层肚|黑鱼片.*|土豆片|千丝黄喉|秘制猪脚|脆骨|锁骨|鸡腿|鸡翅|鸭脖|鸭翅|丸子|酥肉|鸭血|肥羊卷|肥牛卷|虾仁|鸭肠|肥肠|鸡杂|猪肝|血旺|泡椒肉丝|泡椒鸡杂|泡椒猪肝|泡椒血旺|青椒肉丝|木耳肉丝|豆干肉丝|莲白肉丝|鱼香肉丝|土豆肉丝|酸菜肉丝|肉丝|肉片)$/;
const SIDE_STALL = /粉|面|米线|麻辣烫|冒菜|螺蛳粉|抄手|云吞|水饺|煲|鸡公煲/;
function isFoodName(name) {
  if (PURE_DRINK.test(name) || NON_DISH.test(name) || SKIP_NAME.test(name)) return false;
  if (/饮料|饮品/.test(name) && !/堡|鸡|饭|面|粉|饺|包|饼|串|肉|鱼|虾|蛋|菜/.test(name)) return false;
  return true;
}

// ---------- 推断规则（与 build-manual.ps1 对齐） ----------
const VEG_KEYWORDS = "素|菠菜|青菜|小白菜|上海青|鸡毛菜|生菜|油麦菜|空心菜|包菜|紫甘蓝|白菜|西兰花|花菜|菜花|土豆|马铃薯|藕|莲藕|山药|冬瓜|南瓜|黄瓜|丝瓜|苦瓜|西葫芦|萝卜|胡萝卜|茄子|番茄|西红柿|玉米|青豆|豌豆|毛豆|豆角|四季豆|豇豆|荷兰豆|芹菜|西芹|韭菜|蒜苔|蒜苗|青椒|尖椒|彩椒|莴笋|竹笋|芦笋|豆芽|豆苗|菌|菇|木耳|银耳|海带|紫菜|粉条|粉丝|面筋|腐竹|豆皮|千叶豆腐|豆腐|豆花|豆浆|牛奶|酸奶|苕皮|凉皮|凉粉|腰果|牛油果|牛蒡|鱼腥草|蔬菜|时蔬|地三鲜|水果|沙拉|粥|莲子|馒头|花卷";
const VEG_LOOKALIKES = "鸡腿菇|鸡枞菌|牛肝菌|羊肚菌|蟹味菇|贝贝南瓜|鱼腥草|面筋|腰果|牛油果|牛蒡|鸡毛菜";
function inferVeg(name) { return new RegExp(VEG_KEYWORDS).test(name); }
function inferMain(name) {
  const n = name.replace(/鱼香/g, "");
  if (/荤/.test(n)) return "荤";
  if (/素鸡|素鸭|素肉|素丸子|素肠|素火腿|素排/.test(n)) return "素";
  const m = n.replace(new RegExp(VEG_LOOKALIKES, "g"), "");
  if (/蛋|卵/.test(m)) return "荤";
  if (/肉|猪|牛|羊|鸡|鸭|鹅|鱼|虾|蟹|贝|丸|肠|排骨|火腿|培根|腊|翅|腿|蹄|肚|肝|腰|筋|鱿|蚝|蛤|螺|蛙|鳝|泥鳅|花甲|蛏|蚬|蚌|渔/.test(m)) return "荤";
  if (/素/.test(n)) return "素";
  if (/抄手|馄饨|云吞|水饺|饺子|锅贴|烧麦/.test(m)) return "荤";
  if (inferVeg(n)) return "素";
  return "荤";
}
function inferSpicy(name, note = "") {
  const s = `${name} ${note}`;
  if (/甜不辣/.test(s)) return 0;
  if (/特辣|变态辣|地狱辣|魔鬼辣/.test(s)) return 3;
  if (/毛血旺|水煮|麻婆|夫妻肺片|香水鱼|冒菜|干锅/.test(s)) return 2;
  if (/麻辣|中辣|重辣|辣度3/.test(s)) return 2;
  if (/微辣|中微辣|少辣|轻辣/.test(s)) return 1;
  if (/不辣|免辣|原汤|清汤/.test(s)) return 0;
  if (/辣/.test(s)) return 1;
  if (/番茄|三鲜/.test(s)) return 0;
  return 0;
}
const HOTPOT_STALLS = new Set(["章尚村麻辣烫", "香灶火锅冒菜"]);
const BAKERY_STALLS = new Set(["喜禾烘焙"]);
const BURGER_STALLS = new Set(["0090汉堡工厂", "今喜炸串"]);
function mapCategory(group, name, stall) {
  if (HOTPOT_STALLS.has(stall) && /毛肚|黄喉|千层肚|虾滑|黑鱼片|宽粉|苕皮|藕片|土豆片|肥牛|丸子|酥肉|鸭血|豆皮|腐竹|金针菇|海带|青菜|时蔬|荤|素|面饼/.test(name)) return "麻辣系列";
  if (BAKERY_STALLS.has(stall)) return /酸奶|麻薯|泡芙|蛋糕|毛巾卷|千层|梦龙|雪媚娘|布丁|双皮奶/.test(name) ? "甜品饮品" : "早餐小吃";
  if (/盖饭|盖码饭|套饭|拌饭|炒饭|煲仔|木桶饭|铁板饭|焗饭|抓饭|焖饭|擂饭|烤盘饭|烧腊饭|饭$/.test(name)) return "盖浇饭";
  if (/焖面|焖饼/.test(name)) return "面食";
  if (/石锅/.test(name)) return "盖浇饭";
  if (/米线|面条|拉面|小面|拌面|汤面|炒面|面$|面块|粉$|米粉|河粉|酸辣粉|螺蛳粉|馄饨|抄手|水饺|云吞|饵丝|铺盖面|渔粉|苕粉|饺子|蘸饺/.test(name)) return "面食";
  if (/麻辣烫|冒菜|香锅|串串香|干锅|麻辣拌|毛血旺|麻辣鱼|麻辣什锦/.test(name)) return "麻辣系列";
  if (/沙拉|轻食/.test(name)) return "轻食沙拉";
  if (/粥$|羹$|汤$|炖汤|汤包/.test(name)) return "汤粥";
  if (/吐司|曲奇|泡芙|欧包|贝果|蛋挞|面包|蛋糕|三明治|麻薯|饼干|蛋卷/.test(name)) return "早餐小吃";
  if (/包子|小笼包|豆沙包|粉丝包|紫薯包|馒头|花卷|饼$|煎饺|烧麦|茶叶蛋|鸡蛋饼|手抓饼|掉渣饼|烤肠|肉肠|玉米$|饭团|糕$|糕（/.test(name)) return "早餐小吃";
  if (/荤豆花|鸡哈豆花/.test(name)) return "家常小炒";
  if (/奶茶|牛奶|酸奶|豆浆|豆花|糖水|甜品|咖啡|果汁|冰粉|凉虾|西米露|汤圆|麻薯|泡芙|蛋糕|毛巾卷|千层|梦龙|雪媚娘|布丁|双皮奶/.test(name)) return "甜品饮品";
  if (/烤串|烧烤|炸串|炸鸡|铁板|烤鸡|烤腿|鸡排|鸡柳|汉堡|薯条|烤堡|堡|热狗|鸡块|鸡翅|鸡腿堡|牛肉堡|牛堡|小食|摇摇薯|糍粑|薯/.test(name)) return "烧烤";
  if (BURGER_STALLS.has(stall) && /炒饭|炒河粉|炒米粉|炒面/.test(name)) return "盖浇饭";
  if (/炒|烧|炖|焖|蒸|煮|煲|干锅|小炒|套餐|酸菜鱼|蚂蚁上树|小锅|健康餐|减脂餐|一荤|二荤|两荤|一素|两素|双拼|拼盘/.test(name)) return "家常小炒";
  if (/盖饭|拌饭|炒饭|套餐/.test(group)) return "盖浇饭";
  if (/面|粉|馄饨|抄手|云吞/.test(group)) return "面食";
  if (/麻辣|香锅|干锅/.test(group)) return "麻辣系列";
  if (/轻食|沙拉/.test(group)) return "轻食沙拉";
  if (/小吃|早餐|饼|烘焙/.test(group)) return "早餐小吃";
  if (/焖|炒|烧|蒸|煲/.test(group)) return "家常小炒";
  if (/鸡|鸭|鹅|鱼|虾|牛|羊|肉|排骨|翅|腿|丸|蛋|豆腐|菌|菇|藕|茄|菜/.test(name)) return "家常小炒";
  return "其他";
}
function inferPortion(name, note) {
  const s = `${name} ${note}`;
  if (/小份|半份|小碗|一两|mini/.test(s)) return "small";
  if (/大份|加大|加量|大碗|三两/.test(s)) return "large";
  return "regular";
}
function inferFlavors(name, spicy, cat, taste) {
  const fl = [];
  if (spicy >= 1) fl.push("辣");
  if (/麻辣|麻婆|花椒|藤椒|椒麻|水煮|夫妻肺片/.test(name)) {
    if (!fl.includes("辣")) fl.push("辣");
    fl.push("麻");
  }
  const sweet = taste.includes("甜") || (cat === "甜品饮品" && !/咸|卤|辣/.test(name)) ||
    /鱼香|糖醋|宫保|蜜汁|茄汁|拔丝|甜|双皮奶|龟苓膏|汤圆|布丁|冰粉|西米露|糖水|蛋糕|红豆沙|绿豆沙|银耳|咕咾|菠萝/.test(name);
  if (sweet) fl.push("甜");
  if (/糖醋|酸甜|咕咾|茄汁|番茄|西红柿|菠萝|山楂|酸梅|柠檬|百香果|酸奶/.test(name)) fl.push("酸甜");
  if (/卤|酱|蒸|炖|烧(?!麦|烤)|白灼/.test(name)) fl.push("咸鲜");
  if (taste.includes("清淡") || /清汤|白汤|清蒸|白灼|粥/.test(name)) fl.push("清淡");
  return [...new Set(fl)];
}
const ICON = {
  盖浇饭: "utensils", 面食: "wheat", 麻辣系列: "cooking-pot", 家常小炒: "beef",
  轻食沙拉: "salad", 汤粥: "soup", 早餐小吃: "croissant", 甜品饮品: "cup", 烧烤: "flame", 其他: "utensils"
};
const CAL = {
  盖浇饭: 700, 面食: 600, 麻辣系列: 750, 家常小炒: 450, 轻食沙拉: 280,
  汤粥: 200, 早餐小吃: 400, 甜品饮品: 350, 烧烤: 650, 其他: 500
};
function enrich(name, price, stall, canteen, group) {
  const cat = mapCategory(group, name, stall);
  const spicy = inferSpicy(name);
  const main = inferMain(name);
  const veg = main === "素";
  const cal = CAL[cat] || 500;
  const taste = [];
  if (spicy === 1) taste.push("微辣");
  if (spicy === 2) taste.push("中辣");
  if (spicy === 3) taste.push("麻辣");
  if (/酸/.test(name)) taste.push("微酸");
  if (/鱼香|糖醋|宫保|蜜汁|茄汁|拔丝|甜|双皮奶|龟苓膏|汤圆|布丁|冰粉|西米露|糖水|蛋糕|红豆沙|绿豆沙|银耳|吐司|曲奇|泡芙|面包/.test(name) && !taste.includes("甜")) taste.push("甜");
  if (cat === "甜品饮品" && !taste.includes("甜") && !/咸|卤|辣/.test(name)) taste.push("甜");
  if (/番茄|三鲜|清汤/.test(name)) taste.push("清淡");
  if (taste.length === 0) taste.push("咸香");
  const tags = [];
  if (price <= 8) tags.push("性价比");
  if (cal <= 350) tags.push("低卡");
  if (veg) tags.push("素食友好");
  if (cal >= 500) tags.push("管饱");
  return {
    id: 0, name, category: cat, icon: ICON[cat] || "utensils",
    taste, flavors: inferFlavors(name, spicy, cat, taste),
    price, cal, tags, desc: `菜单补录，约 ${cal} kcal`,
    veg, spicy, main, portion: inferPortion(name, ""),
    stall, canteen, img: "", rawGroup: group || "菜单补录"
  };
}

// ---------- 主流程 ----------
const store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
const supplement = [];
const report = { sourceDate: "2026-10-03", newStalls: [], mapped: {}, skipped: [] };
const seen = new Set();

for (const vendor of store.vendors) {
  const hisStall = stripCanteen(vendor.stall);
  if (vendor.restaurant === "商业街" || SKIP_STALLS.has(hisStall)) continue;
  const dishes = (vendor.dishes || []).filter((d) => (d.type ?? "food") === "food");
  if (!dishes.length) continue;

  for (const raw of dishes) {
    const price = Number(raw.price);
    if (!(price > 0 && price <= 60)) { report.skipped.push({ stall: hisStall, name: raw.name, reason: "价格异常" }); continue; }
    const name = cleanName(raw.name);
    if (!name || !isFoodName(name)) { report.skipped.push({ stall: hisStall, name: raw.name, reason: "非菜品/饮品" }); continue; }

    let target;
    if (SPLIT_STALL[hisStall]) target = SPLIT_STALL[hisStall](name);
    else target = STALL_MAP[hisStall] || hisStall;

    if (SIDE_ONLY.test(name) && SIDE_STALL.test(target)) {
      report.skipped.push({ stall: target, name, reason: "单点加料/配菜" });
      continue;
    }

    const existing = existingStall.get(target);
    const canteen = existing ? existing.canteen : vendor.restaurant + "餐厅";
    const key = `${target}|${normName(name)}`;
    if ((existing && existing.names.has(normName(name))) || seen.has(key)) {
      report.skipped.push({ stall: target, name, reason: "已存在" });
      continue;
    }
    if (existing && existing.loose.has(looseName(name))) {
      report.skipped.push({ stall: target, name, reason: "近似重复" });
      continue;
    }
    const item = enrich(name, price, target, canteen, "菜单补录");
    if (item.category === "甜品饮品") {
      report.skipped.push({ stall: target, name, reason: "甜品饮品（不进正餐池）" });
      continue;
    }
    supplement.push(item);
    seen.add(key);
    if (!existing) {
      if (!report.newStalls.some((x) => x.stall === target)) {
        report.newStalls.push({ stall: target, canteen, sourceStall: hisStall });
      }
    }
    report.mapped[target] = (report.mapped[target] || 0) + 1;
  }
}

fs.mkdirSync(path.dirname(OUT_SUPPLEMENT), { recursive: true });
fs.writeFileSync(OUT_SUPPLEMENT, JSON.stringify(supplement, null, 2) + "\n", "utf8");
fs.writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2) + "\n", "utf8");

const cats = {};
for (const d of supplement) cats[d.category] = (cats[d.category] || 0) + 1;
console.log(`补充菜品：${supplement.length} 道`);
console.log(`新增档口：${report.newStalls.length} 个`);
report.newStalls.forEach((x) => console.log(`  + ${x.stall} [${x.canteen}]`));
console.log("按档口补充量：");
Object.entries(report.mapped).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: +${v}`));
console.log("按品类：", cats);
console.log(`跳过：${report.skipped.length} 条（详见 mecca-gap-report.json）`);
