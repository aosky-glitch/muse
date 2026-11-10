// ---- Orders API (backed by BEGGING_KV) ----
const KV = typeof BEGGING_KV !== 'undefined' ? BEGGING_KV : null;
function apiJson(data, status) {
  return new Response(JSON.stringify(data), {status: status || 200, headers: {'content-type': 'application/json;charset=utf-8', 'cache-control': 'no-store'}});
}
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  let s = '';
  for (const x of b) s += chars[x % chars.length];
  return s;
}
function toCents(n) { return Math.round(Number(n) * 100); }
async function getOrder(code) {
  if (!KV) return null;
  const raw = await KV.get('order:' + code);
  return raw ? JSON.parse(raw) : null;
}
async function putOrder(o) { await KV.put('order:' + o.code, JSON.stringify(o)); }
async function checkAdmin(pass) {
  if (!KV) return false;
  const saved = await KV.get('admin:password');
  return !!saved && !!pass && pass === saved;
}
async function listPendingByAmount(cents) {
  const list = await KV.list({prefix: 'order:'});
  const out = [];
  const cutoff = Date.now() - 24 * 3600 * 1000;
  for (const k of list.keys) {
    const o = await getOrder(k.name.slice(6));
    if (o && o.status === 'pending_payment' && o.payableCents === cents && o.createdAt > cutoff) out.push(o);
  }
  out.sort((a, b) => a.createdAt - b.createdAt);
  return out;
}
async function checkCallbackKey(req, url, body) {
  const key = (body && body.key) || req.headers.get('X-Callback-Key') || url.searchParams.get('key');
  if (!KV) return false;
  const saved = await KV.get('admin:callback_key');
  return !!saved && !!key && key === saved;
}
async function handleApi(req, url) {
  const p = url.pathname;
  try {
    if (p === '/api/order' && req.method === 'POST') {
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      const hour = new Date().toISOString().slice(0, 13);
      const rlKey = 'rl:' + ip + ':' + hour;
      const rlCount = parseInt((await KV.get(rlKey)) || '0', 10);
      if (rlCount >= 5) return apiJson({ok: false, error: '下单太频繁，请稍后再试'}, 429);
      await KV.put(rlKey, String(rlCount + 1), {expirationTtl: 3600});
      const b = await req.json();
      const service = String(b.service || '').slice(0, 20) || '找资源';
      const detail = String(b.detail || '').slice(0, 2000);
      const extra = String(b.extra || '').slice(0, 200);
      const contact = String(b.contact || '').slice(0, 100);
      const amount = Number(b.amount);
      if (!detail) return apiJson({ok: false, error: '请填写需求描述'}, 400);
      if (!isFinite(amount) || amount < 1 || amount > 10000) return apiJson({ok: false, error: '金额需在 1～10000 元之间'}, 400);
      const tail = 1 + Math.floor(Math.random() * 99);
      const payableCents = toCents(amount) + tail;
      let code = genCode();
      for (let i = 0; i < 5 && await getOrder(code); i++) code = genCode();
      const order = {code, service, detail, extra, contact, amount, payableCents, payable: payableCents / 100, status: 'pending_payment', reply: '', createdAt: Date.now(), paidAt: null, paidAmount: null};
      await putOrder(order);
      return apiJson({ok: true, code, payable: order.payable});
    }
    if (p === '/api/order' && req.method === 'GET') {
      const code = (url.searchParams.get('code') || '').toUpperCase().trim();
      const o = await getOrder(code);
      if (!o) return apiJson({ok: false, error: '没找到这个订单'}, 404);
      if (o.status === 'pending_payment' && Date.now() - o.createdAt > 24 * 3600 * 1000) {
        o.status = 'expired';
        await putOrder(o);
      }
      return apiJson({ok: true, order: {code: o.code, service: o.service, detail: o.detail, payable: o.payable, status: o.status, reply: o.reply || '', createdAt: o.createdAt, paidAt: o.paidAt}});
    }
    if (p === '/api/admin/orders' && req.method === 'POST') {
      const b = await req.json();
      if (!await checkAdmin(b.password)) return apiJson({ok: false, error: '密码不对'}, 403);
      const list = await KV.list({prefix: 'order:'});
      const orders = [];
      for (const k of list.keys) {
        const o = await getOrder(k.name.slice(6));
        if (o) orders.push(o);
      }
      orders.sort((a, b) => b.createdAt - a.createdAt);
      return apiJson({ok: true, orders: orders.slice(0, 100)});
    }
    if (p === '/api/admin/reply' && req.method === 'POST') {
      const b = await req.json();
      if (!await checkAdmin(b.password)) return apiJson({ok: false, error: '密码不对'}, 403);
      const o = await getOrder(String(b.code || '').toUpperCase());
      if (!o) return apiJson({ok: false, error: '没找到这个订单'}, 404);
      o.reply = String(b.reply || '').slice(0, 5000);
      if (b.status === 'in_progress' || b.status === 'done') o.status = b.status;
      await putOrder(o);
      return apiJson({ok: true});
    }
    if (p === '/api/admin/password' && req.method === 'POST') {
      const b = await req.json();
      if (!await checkAdmin(b.password)) return apiJson({ok: false, error: '密码不对'}, 403);
      const np = String(b.newPassword || '');
      if (np.length < 4) return apiJson({ok: false, error: '新密码至少 4 位'}, 400);
      await KV.put('admin:password', np);
      return apiJson({ok: true});
    }
    if (p === '/api/admin/callback-key' && req.method === 'POST') {
      const b = await req.json();
      if (!await checkAdmin(b.password)) return apiJson({ok: false, error: '密码不对'}, 403);
      const nk = String(b.newKey || '');
      if (nk.length < 8) return apiJson({ok: false, error: '新密钥至少 8 位'}, 400);
      await KV.put('admin:callback_key', nk);
      return apiJson({ok: true});
    }
    if (p === '/api/muse-usage' && req.method === 'GET') {
      const key = url.searchParams.get('key') || '';
      const savedKey = await KV.get('muse:usage_key');
      if (!savedKey || key !== savedKey) return apiJson({ok: false, error: 'key 不对'}, 403);
      const raw = await KV.get('muse:usage');
      if (!raw) return apiJson({ok: false, error: '还没有额度数据'}, 404);
      return apiJson({ok: true, usage: JSON.parse(raw)});
    }
    if (p === '/api/pay-callback' && req.method === 'POST') {
      let b = {};
      try { b = await req.json(); } catch (e) { b = {}; }
      if (!await checkCallbackKey(req, url, b)) return apiJson({ok: false, error: '回调密钥不对或未配置'}, 403);
      let cents = null;
      if (b.amount != null && isFinite(Number(b.amount))) cents = toCents(b.amount);
      else if (b.text) {
        const m = String(b.text).match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*元/);
        if (m) cents = toCents(m[1] || m[2]);
      }
      if (cents == null) return apiJson({ok: false, error: '无法从回调中解析金额'}, 400);
      const cands = await listPendingByAmount(cents);
      if (!cands.length) {
        await KV.put('tip:' + Date.now(), JSON.stringify({amount: cents / 100, at: Date.now(), raw: String(b.text || '')}));
        return apiJson({ok: true, matched: null, note: '没有匹配的待付款订单，已记为打赏'});
      }
      const o = cands[0];
      o.status = 'paid';
      o.paidAt = Date.now();
      o.paidAmount = cents / 100;
      await putOrder(o);
      return apiJson({ok: true, matched: o.code, ambiguous: cands.length > 1});
    }
    return apiJson({ok: false, error: 'unknown api'}, 404);
  } catch (e) {
    return apiJson({ok: false, error: '服务器错误：' + e.message}, 500);
  }
}
