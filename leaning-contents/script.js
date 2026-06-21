/* =========================
  設定
========================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxsJyjGVe5QNqw5mVK-Va1LqqKOuuNcXnf52kLSleWu2stYCXjZMWmhFtfziP4P1f191g/exec";

const IMAGE_KEYS = ["image_url", "imageurl", "image"];
const EXCLUDE_KEYS_CARD = ["id", "title", "name", ...IMAGE_KEYS];


/* =========================
  状態管理
========================= */

let currentKey = "";
let items = [];
let editId = null;


/* =========================
  初期化
========================= */

function init() {
  currentKey = getCurrentKey();

  if (!currentKey) {
    showMessage("keyが設定されていません", "error");
    return;
  }

  setTitle();
  bindEvents();
  loadItems();
}

function getCurrentKey() {
  return "books"; // ← ここを変更
}

/* =========================
  keyごとの背景写真（Unsplash）
========================= */
const BG_MAP = {
  jobs: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  // モダンなオフィス・働く空間
  movies: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80",
  // 映画館・スクリーン・暗闇に輝く光
  books: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1600&q=80",
  // 図書館・本棚が並ぶ静かな空間
  restaurants: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  // ムーディーなレストラン・テーブルセッティング
  tourist_attractions: "https://plus.unsplash.com/premium_photo-1727730047398-49766e915c1d?q=80&w=1512&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  // 日本・富士山・旅の雰囲気
};

function setTitle() {
  document.getElementById("page-title").textContent = currentKey;
  document.getElementById("hero-title").textContent = currentKey;

  // mainの背景写真をkeyごとに切り替え
  const bgUrl = BG_MAP[currentKey];
  const mainEl = document.getElementById("main-bg");
  if (mainEl && bgUrl) {
    mainEl.style.backgroundImage = `url(${bgUrl})`;
  }
}


/* =========================
  イベント登録
========================= */

function bindEvents() {
  document.getElementById("add-btn").addEventListener("click", openCreateModal);
  document.getElementById("cancel-btn").addEventListener("click", closeEditModal);
  document.getElementById("form").addEventListener("submit", handleSubmit);

  // 詳細モーダルを閉じる
  document.getElementById("detail-modal").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeDetailModal();
  });
  document.getElementById("detail-close-btn").addEventListener("click", closeDetailModal);

  // 編集モーダルを閉じる
  document.getElementById("modal").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeEditModal();
  });
}


/* =========================
  データ取得
========================= */

async function loadItems() {
  try {
    const res = await fetch(`${API_URL}?key=${encodeURIComponent(currentKey)}`);
    const json = await res.json();

    if (json.status !== "success") {
      showMessage(json.message || "取得エラー", "error");
      return;
    }

    items = json.data || [];
    renderItems();

  } catch (err) {
    showMessage("データ取得エラー: " + err.message, "error");
  }
}


/* =========================
  keyごとの画像スタイル設定
========================= */
const CARD_STYLE_MAP = {
  jobs:               { cardClass: "card-style-jobs",        imageClass: "card-img-jobs" },
  movies:             { cardClass: "card-style-movies",      imageClass: "card-img-movies" },
  books:              { cardClass: "card-style-books",       imageClass: "card-img-books" },
  restaurants:        { cardClass: "card-style-restaurants", imageClass: "card-img-restaurants" },
  tourist_attractions:{ cardClass: "card-style-tourist",     imageClass: "card-img-tourist" }
};


/* =========================
  カード描画（シンプル版）
========================= */

function renderItems() {
  const container = document.getElementById("item-list");
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = `<p style="color:#999;padding:20px;">データがありません</p>`;
    return;
  }

  items.forEach(item => container.appendChild(renderCard(item)));
}

function renderCard(item) {
  const div = document.createElement("div");
  const style = CARD_STYLE_MAP[currentKey] || {};
  div.className = `card ${style.cardClass || ""}`;

  const title = item.title || item.name || Object.values(item).find(v => v) || "No Title";
  const imageKey = Object.keys(item).find(k => IMAGE_KEYS.includes(k.toLowerCase()));
  const imageUrl = imageKey ? item[imageKey] : null;

  const imgClass = `card-image ${style.imageClass || ""}`;
  const imageHtml = imageUrl
    ? `<div class="card-image-wrap"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(String(title))}" class="${imgClass}" onerror="this.parentElement.innerHTML='<div class=card-image-placeholder></div>'"></div>`
    : `<div class="card-image-placeholder"></div>`;

  div.innerHTML = `
    ${imageHtml}
    <div class="card-body">
      <h3>${escapeHtml(String(title))}</h3>
      <div class="card-actions">
        <button class="detail-btn">詳細</button>
        <button class="edit-btn">編集</button>
        <button class="delete-btn">削除</button>
      </div>
    </div>
  `;

  div.querySelector(".detail-btn").onclick = () => openDetailModal(item.id);
  div.querySelector(".edit-btn").onclick = () => openEditModal(item.id);
  div.querySelector(".delete-btn").onclick = () => handleDelete(item.id);

  return div;
}


/* =========================
  詳細モーダル
========================= */

function openDetailModal(id) {
  const item = items.find(i => String(i.id) === String(id));
  if (!item) return;

  const title = item.title || item.name || "No Title";
  const imageKey = Object.keys(item).find(k => IMAGE_KEYS.includes(k.toLowerCase()));
  const imageUrl = imageKey ? item[imageKey] : null;

  const imageHtml = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(String(title))}" class="detail-image" onerror="this.style.display='none'">`
    : "";

  const fieldsHtml = Object.entries(item)
    .filter(([k]) => !["id", "title", "name", ...IMAGE_KEYS].includes(k.toLowerCase()))
    .map(([k, v]) => `
      <div class="detail-field">
        <span class="detail-label">${escapeHtml(k)}</span>
        <span class="detail-value">${escapeHtml(String(v ?? ""))}</span>
      </div>
    `).join("");

  document.getElementById("detail-content").innerHTML = `
    ${imageHtml}
    <h2 class="detail-title">${escapeHtml(String(title))}</h2>
    <div class="detail-fields">${fieldsHtml}</div>
  `;

  document.getElementById("detail-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDetailModal() {
  document.getElementById("detail-modal").classList.add("hidden");
  document.body.style.overflow = "";
}


/* =========================
  編集モーダル
========================= */

function openCreateModal() {
  editId = null;
  document.getElementById("modal-title").textContent = "新規作成";
  buildForm();
  document.getElementById("modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function openEditModal(id) {
  editId = id;
  const item = items.find(i => String(i.id) === String(id));
  if (!item) return;

  document.getElementById("modal-title").textContent = "編集";
  buildForm(item);
  document.getElementById("modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeEditModal() {
  document.getElementById("modal").classList.add("hidden");
  document.body.style.overflow = "";
  document.getElementById("message").textContent = "";
  document.getElementById("message").className = "message";
}


/* =========================
  フォーム生成
========================= */

function buildForm(item = {}) {
  const container = document.getElementById("form-fields");
  container.innerHTML = "";

  if (items.length === 0) return;

  const keys = Object.keys(items[0]).filter(k => k.toLowerCase() !== "id");

  keys.forEach(key => {
    const value = item[key] !== undefined ? item[key] : "";

    const label = document.createElement("label");
    label.textContent = key;
    label.style.cssText = "font-size:12px;color:#888;margin-bottom:2px;display:block;";

    const input = document.createElement("input");
    input.name = key;
    input.placeholder = key;
    input.value = value;

    container.appendChild(label);
    container.appendChild(input);
  });
}


/* =========================
  送信
========================= */

function handleSubmit(e) {
  e.preventDefault();
  const data = getFormData();
  editId !== null ? updateItem(editId, data) : createItem(data);
}

function getFormData() {
  const formData = new FormData(document.getElementById("form"));
  const obj = {};
  for (let [key, value] of formData.entries()) obj[key] = value;
  return obj;
}


/* =========================
  API操作
========================= */

async function createItem(data) { await sendPost("create", data, null); }
async function updateItem(id, data) { await sendPost("update", data, id); }

async function handleDelete(id) {
  if (!confirm("削除しますか？")) return;
  await sendPost("delete", {}, id);
}

async function sendPost(action, data, id) {
  try {
    const body = { action, key: currentKey, data };
    if (id !== null) body.id = id;

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    });

    const json = await res.json();

    if (json.status === "success") {
      showMessage("成功しました ✓", "success");
      closeEditModal();
      await loadItems();
    } else {
      showMessage(json.message || "エラーが発生しました", "error");
    }
  } catch (err) {
    showMessage("通信エラー: " + err.message, "error");
  }
}


/* =========================
  メッセージ
========================= */

function showMessage(msg, type) {
  const el = document.getElementById("message");
  el.textContent = msg;
  el.className = `message ${type}`;
  if (type === "success") {
    setTimeout(() => { el.textContent = ""; el.className = "message"; }, 3000);
  }
}


/* =========================
  ユーティリティ
========================= */

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


/* =========================
  実行
========================= */

init();