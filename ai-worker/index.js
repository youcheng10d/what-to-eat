// 吃嘛 · AI 代理 Worker
// 作用只有一个：把 API Key 挡在服务端。前端永远拿不到 key，也不用因为换模型改代码。
//
// 部署：
//   npm i -g wrangler
//   wrangler login
//   wrangler secret put AI_KEY          # 任意 OpenAI 兼容服务的 key
//   wrangler secret put VISION_KEY      # 可选，视觉模型单独一套时填
//   wrangler deploy
// 部署完把 https://<name>.<account>.workers.dev 填进应用（页脚「AI 设置」）。

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  });

// 模型经常把 JSON 包在 ```json 里，或者前后带一句客套话
function pickJSON(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

async function chat(env, messages, opts) {
  const o = opts || {};
  const base = (o.vision ? env.VISION_BASE : env.AI_BASE) || "https://api.deepseek.com";
  // secret 是整行粘贴进来的，末尾常带换行/空格；带进 Authorization 头会让上游直接 400 空响应。
  const key = ((o.vision ? env.VISION_KEY || env.AI_KEY : env.AI_KEY) || "").trim();
  const model = ((o.model || (o.vision ? env.VISION_MODEL : env.TEXT_MODEL)) || "deepseek-chat").trim();
  if (!key) return { error: "未配置 API Key" };
  if (!model) return { error: "未配置模型名" };

  const url = base.replace(/\/+$/, "") + "/chat/completions";
  const call = (jsonMode) => fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + key },
    body: JSON.stringify({
      model,
      messages,
      temperature: o.temperature == null ? 0.4 : o.temperature,
      max_tokens: o.maxTokens || 2000,
      // 部分国产文本模型默认开思考模式，会把 token 全烧在推理上导致 content 为空，这里显式关掉。
      // 视觉模型（Qwen3-VL-Instruct）不认这个参数，传了会直接 400，所以只对文本模型加。
      ...(o.vision ? {} : { enable_thinking: false, thinking: { type: "disabled" } }),
      // 不是所有 OpenAI 兼容服务都实现了 json_object（硅基流动的部分 Qwen 模型会直接 400），
      // 所以下面留了一次去掉该参数的重试；解析侧本来就有 pickJSON 兜底。
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  let res = await call(true);
  if (!res.ok && res.status === 400) {
    res = await call(false);
  }
  if (!res.ok) {
    const detail = await res.text();
    return { error: `上游 ${res.status}: ${detail.slice(0, 300) || "(空响应)"}` };
  }
  const data = await res.json();
  const choice = (data.choices && data.choices[0]) || {};
  const msg = choice.message || {};
  // 部分模型的可见输出为空、正文落在 reasoning_content（实测 GLM-5.3-Flash 如此），两手都接。
  const text = msg.content || msg.reasoning_content;
  if (!text) {
    return {
      error: "模型返回空 content",
      finish: choice.finish_reason,
      msgKeys: Object.keys(msg),
      usage: data.usage,
      raw: JSON.stringify(data).slice(0, 400),
    };
  }
  const parsed = pickJSON(text);
  return parsed ? { data: parsed } : { error: "模型没有返回合法 JSON", raw: String(text || "").slice(0, 400) };
}

const NUTRITION_SYSTEM = `你是大学食堂的营养拆解助手。用户给你一道真实在售的菜品，你估算它的主要原料与可食部克数。
规则：
0. 菜名里直接出现的食材必须出现在结果里（番茄炒蛋 → 番茄、鸡蛋；牛肉面 → 牛肉、面条），不要套用通用模板。
1. 只输出 JSON，不要任何解释。
2. 4-6 项原料，按克数从大到小排列。
3. 克数是「一份」的熟重，取 5 的倍数，整份总重控制在 200-600g。
4. name 必须是常见食材名（如 米饭、面条、猪五花、鸡蛋、番茄、食用油），不要写菜名，不要写品牌和调味料名。
5. 绝对不要输出热量数值——热量由系统用食物成分表计算，你只负责给克数。
输出格式：{"items":[{"name":"米饭","g":250}]}`;

const ORACLE_SYSTEM = `你在一个食堂点餐小游戏里扮演「解签人」。用户会说一句和吃饭有关、但通常很荒诞的话（例如「高数要挂了」「帮我看看手相」「转了三圈烟灭了」）。
你的任务不是推荐菜，而是把这句话翻译成一张签和一组可执行的筛选条件。
规则：
1. 只输出 JSON。
2. sign：一句 8-18 字的签文，像食堂窗口贴的纸条，要具体、有画面、带一点冷幽默。不要鸡汤，不要「愿你」。
3. topic：两个字概括主题。
4. category 只能从这 9 个里选一个或留空字符串：面食、盖浇饭、家常小炒、麻辣系列、烧烤、早餐小吃、甜品饮品、汤粥、其他。
5. flavors 只能从：辣、麻、酸甜、咸鲜、清淡、甜。
6. tags 只能从：管饱、高蛋白、低卡、暖胃、人气、性价比、下饭、解馋。
7. avoid：要避开的菜名关键词，最多 2 个，可以是空数组。
8. why：一句话说明「这个签为什么对应这些条件」，不超过 30 字。
输出格式：{"sign":"","topic":"","category":"","flavors":[],"tags":[],"avoid":[],"why":""}`;

const PORTRAIT_SYSTEM = `你是校园食堂点餐助手的「状态观察员」。用户会给你一张自拍，你只做客观、温和、可验证的表面观察，并与饮食建议挂钩。
严格遵守：
1. 只输出 JSON。
2. 不做任何医疗诊断，不使用「患病」「炎症」「内分泌」「湿气」这类词。
3. 不评价美丑、胖瘦、年龄、性别、身份、穿着。
4. 只写照片里能看见的：皮肤状态、精神状态、是否出汗、是否戴眼镜。
5. label 只能从这些里选：痘、油腻、上火、干燥、浮肿、气色暗、疲惫、黑眼圈、泛红。最多 3 个。
6. evidence 写你看到的部位和现象，不超过 20 字，只描述不评判。
7. 如果看不清人脸，observations 返回空数组。
输出格式：{"observations":[{"label":"痘","evidence":"面颊有两处泛红"}],"summary":"一句话，不超过 25 字"}`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (url.pathname === "/health") {
      return json({
        ok: true,
        text: !!(env.AI_KEY && (env.TEXT_MODEL || "deepseek-chat")),
        vision: !!(env.VISION_MODEL && (env.VISION_KEY || env.AI_KEY)),
      });
    }
    // 换模型时的排障入口：用 Worker 自己的 key 代查上游模型列表，key 不出站。
    if (url.pathname === "/models" && request.method === "GET") {
      const key = (env.AI_KEY || "").trim();
      if (!key) return json({ error: "未配置 API Key" }, 400);
      const base = (env.AI_BASE || "").replace(/\/+$/, "");
      const res = await fetch(base + "/models", { headers: { authorization: "Bearer " + key } });
      const raw = await res.text();
      let ids = [];
      try {
        const data = JSON.parse(raw);
        ids = (data.data || []).map((m) => m.id);
      } catch (e) { /* 上游可能返回非 JSON */ }
      return json({ status: res.status, keyLen: key.length, keyTail: key.slice(-4), count: ids.length, ids, raw: ids.length ? undefined : raw.slice(0, 300) });
    }
    if (request.method !== "POST") return json({ error: "只接受 POST" }, 405);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "请求体不是 JSON" }, 400);
    }

    try {
      if (url.pathname === "/nutrition") {
        const d = body.dish || {};
        if (!d.name) return json({ error: "缺少 dish.name" }, 400);
        const r = await chat(env, [
          { role: "system", content: NUTRITION_SYSTEM },
          {
            role: "user",
            content: `菜品：${d.name}\n档口：${d.stall || "未知"}\n分类：${d.category || "未知"}\n菜单标称热量：${d.menuCal || "无"}kcal\n售价：${d.price || "?"}元`,
          },
        ], { model: env.NUTRITION_MODEL, temperature: 0.2, maxTokens: 400 });
        if (r.error) return json(r, 502);
        const items = Array.isArray(r.data.items) ? r.data.items.slice(0, 8) : [];
        return json({ items: items.map((x) => ({ name: String(x.name || ""), g: Number(x.g) || 0 })) });
      }

      if (url.pathname === "/oracle") {
        const text = String(body.text || "").slice(0, 200);
        if (!text) return json({ error: "缺少 text" }, 400);
        const r = await chat(env, [
          { role: "system", content: ORACLE_SYSTEM },
          { role: "user", content: text },
        ], { temperature: 0.9, maxTokens: 1000 });
        if (r.error) return json(r, 502);
        return json(r.data);
      }

      if (url.pathname === "/portrait") {
        const image = String(body.image || "");
        if (!image.startsWith("data:image/")) return json({ error: "缺少图片" }, 400);
        if (image.length > 1_600_000) return json({ error: "图片过大" }, 413);
        const r = await chat(env, [
          { role: "system", content: PORTRAIT_SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "看看这张照片，给食堂点餐提一个温和的观察。" },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ], { vision: true, temperature: 0.3, maxTokens: 1000 });
        if (r.error) return json(r, 502);
        const obs = Array.isArray(r.data.observations) ? r.data.observations.slice(0, 3) : [];
        return json({
          observations: obs.map((o) => ({ label: String(o.label || ""), evidence: String(o.evidence || "") })),
          summary: String(r.data.summary || ""),
        });
      }

      return json({ error: "未知接口" }, 404);
    } catch (e) {
      return json({ error: "Worker 异常：" + (e && e.message ? e.message : "unknown") }, 500);
    }
  },
};
