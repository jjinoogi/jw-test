/* ==========================================================================
   OFF PG 가맹점 신청 웹 솔루션 — 공통 UI 유틸리티
   ========================================================================== */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  /* 배포 위치가 어디든(로컬/서브패스) 동작하도록 사이트 루트 경로를 계산 */
  function siteBase() {
    // 현재 스크립트가 /assets/js/common.js 로 로드된 위치를 기준으로 루트를 역산
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      var idx = src.indexOf("assets/js/common.js");
      if (idx !== -1) {
        return src.slice(0, idx); // 예: "/off-pg-mockup/" 또는 "../"
      }
    }
    return "./";
  }

  function absBase() {
    // location.pathname 기준 절대 루트 경로 계산 (merchant 링크 생성용)
    var path = window.location.pathname;
    var marker = "/merchant/";
    var idx = path.indexOf(marker);
    if (idx !== -1) return path.slice(0, idx + 1);
    // /admin/ /partner/ /agency/ 하위에서 호출되는 경우 상위 폴더 제거
    var parts = path.split("/").filter(Boolean);
    if (parts.length && ["admin", "partner", "agency", "merchant"].indexOf(parts[parts.length - 1]) === -1) {
      parts.pop(); // index.html 등 파일명 제거
    }
    if (parts.length && ["admin", "partner", "agency", "merchant"].indexOf(parts[parts.length - 1]) !== -1) {
      parts.pop();
    }
    return parts.length ? "/" + parts.join("/") + "/" : "/";
  }

  function merchantUrl(code) {
    return window.location.origin + absBase() + "merchant/#" + code;
  }

  function merchantHref(code) {
    return absBase() + "merchant/index.html#" + code;
  }

  function shortUrl(code) {
    return "…/" + code;
  }

  /* ---------------- Badge ---------------- */
  function badge(text, kind) {
    return '<span class="badge badge-' + kind + '">' + escapeHtml(text) + "</span>";
  }

  function attachBadge(status) {
    return status === "등록" ? badge("등록", "green") : status === "-" ? badge("-", "gray") : badge("미등록", "gray");
  }

  // 관리 권한 있는 화면(어드민)에서 클릭 가능한 상태 뱃지 (드롭다운)
  function statusDropdown(id, field, current, options, colorKind) {
    var uidStr = "sd-" + id + "-" + field;
    var html = '<div class="status-dropdown" data-sd="' + uidStr + '">';
    html +=
      '<button type="button" class="badge badge-' +
      colorKind +
      ' badge-btn" data-toggle="' +
      uidStr +
      '">' +
      escapeHtml(current) +
      " ▾</button>";
    html += '<div class="status-menu" data-menu="' + uidStr + '">';
    options.forEach(function (opt) {
      html +=
        '<button type="button" data-id="' +
        id +
        '" data-field="' +
        field +
        '" data-value="' +
        escapeHtml(opt) +
        '">' +
        escapeHtml(opt) +
        "</button>";
    });
    html += "</div></div>";
    return html;
  }

  function wireStatusDropdowns(onChange) {
    document.querySelectorAll(".status-dropdown [data-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var key = btn.getAttribute("data-toggle");
        document.querySelectorAll(".status-menu").forEach(function (m) {
          if (m.getAttribute("data-menu") !== key) m.classList.remove("open");
        });
        var menu = document.querySelector('.status-menu[data-menu="' + key + '"]');
        if (menu) menu.classList.toggle("open");
      });
    });
    document.querySelectorAll(".status-menu button[data-id]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = btn.getAttribute("data-id");
        var field = btn.getAttribute("data-field");
        var value = btn.getAttribute("data-value");
        onChange(id, field, value);
        btn.closest(".status-menu").classList.remove("open");
      });
    });
    document.addEventListener("click", function () {
      document.querySelectorAll(".status-menu.open").forEach(function (m) {
        m.classList.remove("open");
      });
    });
  }

  /* ---------------- Toast ---------------- */
  function ensureToastWrap() {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function toast(msg) {
    var wrap = ensureToastWrap();
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add("show");
    });
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () {
        el.remove();
      }, 250);
    }, 2200);
  }

  /* ---------------- Modal ---------------- */
  function ensureModalRoot() {
    var root = document.getElementById("modal-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "modal-root";
      document.body.appendChild(root);
    }
    return root;
  }

  function openModal(innerHtml) {
    var root = ensureModalRoot();
    root.innerHTML =
      '<div class="modal-overlay open" id="active-modal-overlay"><div class="modal-box">' + innerHtml + "</div></div>";
    var overlay = document.getElementById("active-modal-overlay");
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
    root.querySelectorAll("[data-close-modal]").forEach(function (btn) {
      btn.addEventListener("click", closeModal);
    });
  }

  function closeModal() {
    var root = document.getElementById("modal-root");
    if (root) root.innerHTML = "";
  }

  /* ---------------- Topbar ---------------- */
  function renderTopbar(opts) {
    // opts: { brand, brandSub, userName, onLogout(url) }
    var el = document.getElementById("topbar");
    if (!el) return;
    el.innerHTML =
      '<div class="brand">' +
      escapeHtml(opts.brand) +
      (opts.brandSub ? "<small>" + escapeHtml(opts.brandSub) + "</small>" : "") +
      '</div>' +
      '<div class="user-area" id="user-area">' +
      '<span class="avatar-dot"></span>' +
      '<span>' + escapeHtml(opts.userName) + "님</span>" +
      '<div class="user-dropdown" id="user-dropdown">' +
      '<button type="button" id="logout-btn">로그아웃</button>' +
      "</div></div>";

    document.getElementById("user-area").addEventListener("click", function (e) {
      e.stopPropagation();
      document.getElementById("user-dropdown").classList.toggle("open");
    });
    document.addEventListener("click", function () {
      var dd = document.getElementById("user-dropdown");
      if (dd) dd.classList.remove("open");
    });
    document.getElementById("logout-btn").addEventListener("click", function () {
      OffPG.session.clear();
      window.location.href = opts.loginUrl;
    });
  }

  function renderSidebar(activeKey, base) {
    var el = document.getElementById("sidebar");
    if (!el) return;
    var items = [
      { key: "dashboard", label: "대시보드", href: base + "dashboard.html" },
      { key: "companies", label: "업체관리", href: base + "companies.html" },
      { key: "users", label: "사용자관리", href: base + "users.html" }
    ];
    el.innerHTML =
      "<nav>" +
      items
        .map(function (it) {
          return (
            '<a href="' +
            it.href +
            '" class="' +
            (it.key === activeKey ? "active" : "") +
            '">' +
            it.label +
            "</a>"
          );
        })
        .join("") +
      "</nav>";
  }

  function requireSession(role, loginUrl) {
    var s = OffPG.session.get();
    if (!s || s.role !== role) {
      window.location.href = loginUrl;
      return null;
    }
    return s;
  }

  global.OffPGUI = {
    escapeHtml: escapeHtml,
    siteBase: siteBase,
    absBase: absBase,
    merchantUrl: merchantUrl,
    merchantHref: merchantHref,
    shortUrl: shortUrl,
    badge: badge,
    attachBadge: attachBadge,
    statusDropdown: statusDropdown,
    wireStatusDropdowns: wireStatusDropdowns,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    renderTopbar: renderTopbar,
    renderSidebar: renderSidebar,
    requireSession: requireSession
  };
})(window);
