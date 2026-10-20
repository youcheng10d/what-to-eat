// mock.js — 50 道大学食堂菜品（唯一数据源，无散落硬编码）
// Dish: { id, name, category, icon, taste[], price(元), cal(kcal), tags[], desc, veg(蛋奶素/素), spicy(0-3) }
(function () {
  window.DB = {
    dishes: [
      // —— 盖浇饭（12）——
      { id: 1,  name: "番茄炒蛋盖饭",   category: "盖浇饭", icon: "utensils",     taste: ["咸香", "微酸"], price: 12, cal: 680, tags: ["人气", "下饭"],          desc: "酸甜番茄裹着嫩滑鸡蛋，汤汁拌饭一绝。", veg: true,  spicy: 0 },
      { id: 2,  name: "红烧肉盖饭",     category: "盖浇饭", icon: "utensils",     taste: ["咸香"],         price: 16, cal: 880, tags: ["解馋", "下饭"],          desc: "浓油赤酱慢炖，肥而不腻的快乐源泉。",   veg: false, spicy: 0 },
      { id: 3,  name: "青椒肉丝盖饭",   category: "盖浇饭", icon: "utensils",     taste: ["咸香", "微辣"], price: 13, cal: 640, tags: ["下饭", "快手"],          desc: "青椒爽脆肉丝入味，家常锅气十足。",     veg: false, spicy: 1 },
      { id: 4,  name: "宫保鸡丁盖饭",   category: "盖浇饭", icon: "utensils",     taste: ["咸香", "微辣"], price: 14, cal: 720, tags: ["人气", "招牌"],          desc: "花生酥脆、鸡丁嫩滑，微辣带甜。",       veg: false, spicy: 1 },
      { id: 5,  name: "土豆牛肉盖饭",   category: "盖浇饭", icon: "utensils",     taste: ["咸香"],         price: 15, cal: 760, tags: ["量大", "暖胃"],          desc: "牛肉炖到酥烂，土豆吸饱汤汁。",         veg: false, spicy: 0 },
      { id: 6,  name: "鱼香肉丝盖饭",   category: "盖浇饭", icon: "utensils",     taste: ["咸香", "微辣"], price: 13, cal: 700, tags: ["下饭", "人气"],          desc: "经典酸甜微辣，没有鱼也很香。",         veg: false, spicy: 1 },
      { id: 7,  name: "麻婆豆腐盖饭",   category: "盖浇饭", icon: "utensils",     taste: ["咸香", "中辣"], price: 12, cal: 620, tags: ["下饭", "人气"],          desc: "麻辣鲜香烫，豆腐嫩得筷子都夹不住。",   veg: false, spicy: 2 },
      { id: 8,  name: "咖喱鸡排饭",     category: "盖浇饭", icon: "utensils",     taste: ["咸香", "微辣"], price: 15, cal: 780, tags: ["解馋", "量大"],          desc: "浓稠咖喱浇上炸鸡排，异域风味管饱。",   veg: false, spicy: 1 },
      { id: 9,  name: "台式卤肉饭",     category: "盖浇饭", icon: "utensils",     taste: ["咸香"],         price: 13, cal: 750, tags: ["招牌", "下饭"],          desc: "卤肉燥油亮喷香，配颗卤蛋更满足。",     veg: false, spicy: 0 },
      { id: 10, name: "黑椒牛柳饭",     category: "盖浇饭", icon: "utensils",     taste: ["咸香"],         price: 16, cal: 730, tags: ["高蛋白", "解馋"],        desc: "牛柳滑嫩黑椒香，锅气直冲天灵盖。",     veg: false, spicy: 0 },
      { id: 11, name: "香菇滑鸡盖饭",   category: "盖浇饭", icon: "utensils",     taste: ["鲜香"],         price: 14, cal: 640, tags: ["暖胃", "下饭"],          desc: "滑鸡嫩得像布丁，香菇提鲜一绝。",       veg: false, spicy: 0 },
      { id: 12, name: "韩式石锅拌饭",   category: "盖浇饭", icon: "utensils",     taste: ["咸香", "微辣"], price: 16, cal: 700, tags: ["人气", "解馋"],          desc: "锅巴咔吱响，拌上辣酱一勺入魂。",       veg: false, spicy: 1 },
      // —— 面食（8）——
      { id: 13, name: "兰州牛肉拉面",   category: "面食",   icon: "wheat",        taste: ["鲜香"],         price: 13, cal: 620, tags: ["招牌", "暖胃"],          desc: "汤清面弹，一清二白三红四绿。",         veg: false, spicy: 0 },
      { id: 14, name: "老北京炸酱面",   category: "面食",   icon: "wheat",        taste: ["咸香"],         price: 12, cal: 700, tags: ["人气", "量大"],          desc: "酱香浓郁菜码足，拌匀才够味。",         veg: false, spicy: 0 },
      { id: 15, name: "西红柿鸡蛋面",   category: "面食",   icon: "wheat",        taste: ["微酸", "咸香"], price: 9,  cal: 560, tags: ["性价比", "暖胃"],        desc: "酸甜汤头暖胃，深夜救赎第一名。",       veg: true,  spicy: 0 },
      { id: 16, name: "红烧牛肉面",     category: "面食",   icon: "wheat",        taste: ["鲜香"],         price: 15, cal: 720, tags: ["量大", "解馋"],          desc: "大块牛肉软烂入味，汤头醇厚。",         veg: false, spicy: 0 },
      { id: 17, name: "重庆小面",       category: "面食",   icon: "wheat",        taste: ["咸香", "中辣"], price: 11, cal: 600, tags: ["人气", "解馋"],          desc: "麻辣鲜香一碗端，嗦完直冒汗。",         veg: false, spicy: 2 },
      { id: 18, name: "葱油拌面",       category: "面食",   icon: "wheat",        taste: ["咸香"],         price: 8,  cal: 640, tags: ["性价比", "快手"],        desc: "葱油焦香扑鼻，简单却勾魂。",           veg: true,  spicy: 0 },
      { id: 19, name: "三鲜水饺",       category: "面食",   icon: "wheat",        taste: ["鲜香"],         price: 12, cal: 580, tags: ["人气", "暖胃"],          desc: "皮薄馅大汁水足，一口一个。",           veg: false, spicy: 0 },
      { id: 20, name: "酸菜肉丝面",     category: "面食",   icon: "wheat",        taste: ["酸辣"],         price: 12, cal: 620, tags: ["解馋", "下饭"],          desc: "酸菜开胃解腻，汤都要喝光。",           veg: false, spicy: 1 },
      // —— 麻辣系列（3）——
      { id: 21, name: "麻辣烫",         category: "麻辣系列", icon: "cooking-pot", taste: ["麻辣"],        price: 16, cal: 780, tags: ["人气", "解馋"],          desc: "荤素自选自由配，汤底越煮越香。",       veg: false, spicy: 3 },
      { id: 22, name: "冒菜",           category: "麻辣系列", icon: "cooking-pot", taste: ["麻辣"],        price: 15, cal: 740, tags: ["解馋", "量大"],          desc: "一个人的火锅，麻辣过瘾。",             veg: false, spicy: 3 },
      { id: 23, name: "麻辣香锅",       category: "麻辣系列", icon: "cooking-pot", taste: ["麻辣"],        price: 18, cal: 850, tags: ["解馋", "人气"],          desc: "干香麻辣不配汤，越吃越上头。",         veg: false, spicy: 3 },
      // —— 家常小炒（8）——
      { id: 24, name: "回锅肉",         category: "家常小炒", icon: "beef",       taste: ["咸香", "微辣"], price: 14, cal: 520, tags: ["下饭", "人气"],          desc: "蒜苗煸出虎皮香，米饭杀手本杀。",       veg: false, spicy: 1 },
      { id: 25, name: "鱼香茄子",       category: "家常小炒", icon: "carrot",     taste: ["微酸", "咸香"], price: 12, cal: 380, tags: ["下饭"],                  desc: "茄子软糯挂满鱼香汁，超级下饭。",       veg: true,  spicy: 0 },
      { id: 26, name: "干煸四季豆",     category: "家常小炒", icon: "carrot",     taste: ["咸香", "微辣"], price: 11, cal: 320, tags: ["下饭", "快手"],          desc: "煸到起虎皮，干香有嚼劲。",             veg: true,  spicy: 1 },
      { id: 27, name: "蒜蓉西兰花",     category: "家常小炒", icon: "salad",      taste: ["清淡"],         price: 9,  cal: 180, tags: ["低卡", "素食友好"],      desc: "爽脆清甜，减脂期也能吃出幸福感。",     veg: true,  spicy: 0 },
      { id: 28, name: "糖醋里脊",       category: "家常小炒", icon: "beef",       taste: ["甜", "微酸"],   price: 14, cal: 460, tags: ["人气", "解馋"],          desc: "外酥里嫩酸甜裹身，小朋友都抢。",       veg: false, spicy: 0 },
      { id: 29, name: "可乐鸡翅",       category: "家常小炒", icon: "beef",       taste: ["甜"],           price: 13, cal: 480, tags: ["解馋", "人气"],          desc: "甜咸入味酱汁浓稠，啃到停不下来。",     veg: false, spicy: 0 },
      { id: 30, name: "木须肉",         category: "家常小炒", icon: "beef",       taste: ["鲜香", "咸香"], price: 13, cal: 420, tags: ["下饭", "快手"],          desc: "鸡蛋木耳黄花菜，营养均衡老味道。",     veg: false, spicy: 0 },
      { id: 31, name: "酸辣土豆丝",     category: "家常小炒", icon: "carrot",     taste: ["酸辣"],         price: 8,  cal: 260, tags: ["性价比", "下饭"],        desc: "酸辣脆爽，五块钱的快乐。",             veg: true,  spicy: 1 },
      // —— 轻食沙拉（4）——
      { id: 32, name: "鸡胸肉牛油果沙拉", category: "轻食沙拉", icon: "salad",     taste: ["清淡"],         price: 16, cal: 320, tags: ["低卡", "高蛋白"],        desc: "优质蛋白加好脂肪，增肌减脂都友好。",   veg: false, spicy: 0 },
      { id: 33, name: "凯撒沙拉",       category: "轻食沙拉", icon: "salad",      taste: ["清淡"],         price: 15, cal: 350, tags: ["人气"],                  desc: "罗马生菜配帕玛森，经典不踩雷。",       veg: false, spicy: 0 },
      { id: 34, name: "藜麦鸡胸沙拉",   category: "轻食沙拉", icon: "salad",      taste: ["清淡"],         price: 17, cal: 300, tags: ["低卡", "高蛋白"],        desc: "超级谷物饱腹感强，轻断食首选。",       veg: false, spicy: 0 },
      { id: 35, name: "蔬菜鸡蛋沙拉",   category: "轻食沙拉", icon: "salad",      taste: ["清淡"],         price: 12, cal: 220, tags: ["低卡", "素食友好"],      desc: "缤纷蔬果加水煮蛋，清爽无负担。",       veg: true,  spicy: 0 },
      // —— 汤粥（5）——
      { id: 36, name: "紫菜蛋花汤",     category: "汤粥",   icon: "soup",         taste: ["清淡"],         price: 4,  cal: 90,  tags: ["性价比", "暖胃"],        desc: "热乎乎一碗下肚，胃先被熨平了。",       veg: true,  spicy: 0 },
      { id: 37, name: "番茄蛋汤",       category: "汤粥",   icon: "soup",         taste: ["清淡", "微酸"], price: 5,  cal: 120, tags: ["暖胃", "性价比"],        desc: "酸甜开胃，米饭最佳搭子。",             veg: true,  spicy: 0 },
      { id: 38, name: "皮蛋瘦肉粥",     category: "汤粥",   icon: "soup",         taste: ["咸香"],         price: 7,  cal: 380, tags: ["暖胃", "人气"],          desc: "绵密顺滑，肠胃不适时的一碗温柔。",     veg: false, spicy: 0 },
      { id: 39, name: "小米南瓜粥",     category: "汤粥",   icon: "soup",         taste: ["清淡", "甜"],   price: 5,  cal: 240, tags: ["暖胃", "素食友好"],      desc: "金黄软糯，天然的甜味刚刚好。",         veg: true,  spicy: 0 },
      { id: 40, name: "银耳莲子羹",     category: "汤粥",   icon: "soup",         taste: ["甜"],           price: 6,  cal: 180, tags: ["低卡", "素食友好"],      desc: "胶质满满，润燥养颜小甜水。",           veg: true,  spicy: 0 },
      // —— 早餐小吃（6）——
      { id: 41, name: "茶叶蛋（2个）",  category: "早餐小吃", icon: "egg",        taste: ["咸香"],         price: 3,  cal: 160, tags: ["性价比", "高蛋白"],      desc: "卤香入味的琥珀纹，课间补给神器。",     veg: true,  spicy: 0 },
      { id: 42, name: "鲜肉包子（2个）", category: "早餐小吃", icon: "croissant",  taste: ["咸香"],        price: 5,  cal: 440, tags: ["人气", "快手"],          desc: "面皮松软肉馅爆汁，出炉即空。",         veg: false, spicy: 0 },
      { id: 43, name: "煎饺（6个）",    category: "早餐小吃", icon: "croissant",  taste: ["咸香"],        price: 7,  cal: 480, tags: ["解馋", "人气"],          desc: "底壳金黄焦脆，蘸醋更销魂。",           veg: false, spicy: 0 },
      { id: 44, name: "手抓饼加蛋",     category: "早餐小吃", icon: "croissant",  taste: ["咸香"],        price: 7,  cal: 520, tags: ["人气", "快手"],          desc: "千层酥皮咔嚓响，加蛋加肠都好吃。",     veg: true,  spicy: 0 },
      { id: 45, name: "糯米烧麦（2个）", category: "早餐小吃", icon: "croissant",  taste: ["咸香"],        price: 4,  cal: 380, tags: ["性价比", "暖胃"],        desc: "糯米油润香菇鲜，顶口开花。",           veg: true,  spicy: 0 },
      { id: 46, name: "葱花鸡蛋饼",     category: "早餐小吃", icon: "egg",        taste: ["咸香"],         price: 6,  cal: 460, tags: ["快手", "性价比"],        desc: "葱香混着蛋香，热乎的最香。",           veg: true,  spicy: 0 },
      // —— 甜品饮品（4）——
      { id: 47, name: "葡式蛋挞（2个）", category: "甜品饮品", icon: "cake-slice", taste: ["甜"],          price: 6,  cal: 320, tags: ["人气", "解馋"],          desc: "酥皮千层蛋心颤巍巍，趁热吃。",         veg: true,  spicy: 0 },
      { id: 48, name: "双皮奶",         category: "甜品饮品", icon: "cake-slice", taste: ["甜"],          price: 7,  cal: 260, tags: ["解馋", "素食友好"],      desc: "奶皮醇厚入口即化，饭后小确幸。",       veg: true,  spicy: 0 },
      { id: 49, name: "绿豆沙",         category: "甜品饮品", icon: "cookie",     taste: ["清淡", "甜"],  price: 5,  cal: 200, tags: ["低卡", "素食友好"],      desc: "冰凉细腻沙沙的，降火神器。",           veg: true,  spicy: 0 },
      { id: 50, name: "酸奶水果捞",     category: "甜品饮品", icon: "cookie",     taste: ["甜", "微酸"],  price: 9,  cal: 240, tags: ["低卡", "素食友好"],      desc: "酸奶裹着时令水果，清爽收尾。",         veg: true,  spicy: 0 },
    ],
  };
})();
