/* ==========================================================================
   OFF PG 가맹점 신청 웹 솔루션 — Mock 데이터 스토어
   실제 서버/DB 없이 localStorage 기반으로 동작하는 전역 데이터 레이어.
   ========================================================================== */
(function (global) {
  "use strict";

  var STORAGE_KEY = "offpg_db_v1";
  var SESSION_KEY = "offpg_session_v1";
  var ROWS = ["영세", "중소1", "중소2", "중소3", "일반"];
  var CONTRACT_STATUSES = ["심사요청", "계약요청", "계약완료", "심사완료"];
  var DEVICE_STATUSES = ["개통요청", "개통완료", "배송중", "배송완료"];

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 9);
  }

  function genCode(len) {
    len = len || 10;
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    var out = "";
    for (var i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function todayStr(offsetDays) {
    var d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function nowDateTimeStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    var hh = String(d.getHours()).padStart(2, "0");
    var mm = String(d.getMinutes()).padStart(2, "0");
    return y + "-" + m + "-" + day + " " + hh + ":" + mm;
  }

  /* ---------------------------------------------------------------------
     시드 데이터 생성
     계층: 어드민(가상) > 총판 3개 > 영업사(총판당 2~3개) > 가맹점
           총판/영업사 모두 가맹점을 직접 등록 가능
     수수료 캐스케이드:
       - 어드민이 업체(주로 총판) 등록 시 D+0/D+1 원가(%)를 입력 (adminCost)
       - 그 업체의 feeTable[row].cost = adminCost[row][settleCycle]
       - 총판/영업사가 하부업체 등록 시, 하부업체.feeTable[row].cost =
         등록하는 주체(부모)의 feeTable[row].sale (없으면 cost) 값을 그대로 상속
       - 하부업체.feeTable[row].profit = 등록 시 입력한 수익(%)
       - 하부업체.feeTable[row].sale = cost + profit
     --------------------------------------------------------------------- */

  function makeAdminCost(base) {
    var t = {};
    ROWS.forEach(function (row, i) {
      t[row] = { d0: round1(base.d0 - i * 0.2), d1: round1(base.d1 - i * 0.2) };
    });
    return t;
  }

  function cycleKey(settleCycle) {
    return settleCycle === "D+0" ? "d0" : "d1";
  }

  function resolveOwnFeeTable(company) {
    // 어드민이 직접 등록한 업체 (adminCost 보유) → cost만 세팅, profit/sale은 null
    var table = {};
    var key = cycleKey(company.settleCycle);
    ROWS.forEach(function (row) {
      table[row] = { cost: company.adminCost[row][key], profit: null, sale: null };
    });
    return table;
  }

  function buildChildFeeTable(parent, profitByRow) {
    var table = {};
    ROWS.forEach(function (row) {
      var parentRow = parent.feeTable[row];
      var cost = round1(parentRow.sale != null ? parentRow.sale : parentRow.cost);
      var profit = profitByRow && profitByRow[row] != null ? profitByRow[row] : round1(0.2 + Math.random() * 0.3);
      table[row] = { cost: cost, profit: round1(profit), sale: round1(cost + profit) };
    });
    return table;
  }

  function seed() {
    var companies = [];

    function pushAdminRegistered(type, name, info, settleCycle, adminCostBase, extra) {
      var c = Object.assign(
        {
          id: uid("c"),
          type: type,
          name: name,
          bizNo: info.bizNo,
          email: info.email,
          phone: info.phone,
          ceo: info.ceo,
          tel: info.tel,
          loginId: info.loginId || null,
          loginPw: info.loginPw || null,
          settleCycle: settleCycle,
          parentId: null,
          parentType: "어드민",
          urlCode: null,
          attachStatus: "미등록",
          contractStatus: "심사요청",
          deviceStatus: "개통요청",
          regDate: todayStr(-Math.floor(Math.random() * 60)),
          active: true,
          adminCost: makeAdminCost(adminCostBase)
        },
        extra || {}
      );
      c.feeTable = resolveOwnFeeTable(c);
      companies.push(c);
      return c;
    }

    function pushChild(type, name, info, parent, profitByRow, extra) {
      var c = Object.assign(
        {
          id: uid("c"),
          type: type,
          name: name,
          bizNo: info.bizNo,
          email: info.email,
          phone: info.phone,
          ceo: info.ceo,
          tel: info.tel,
          loginId: info.loginId || null,
          loginPw: info.loginPw || null,
          settleCycle: parent.settleCycle,
          parentId: parent.id,
          parentType: parent.type,
          urlCode: type === "가맹점" ? genCode(10) : null,
          attachStatus: type === "가맹점" ? (Math.random() > 0.5 ? "등록" : "미등록") : "-",
          contractStatus: CONTRACT_STATUSES[Math.floor(Math.random() * CONTRACT_STATUSES.length)],
          deviceStatus: DEVICE_STATUSES[Math.floor(Math.random() * DEVICE_STATUSES.length)],
          regDate: todayStr(-Math.floor(Math.random() * 45)),
          active: true
        },
        extra || {}
      );
      c.feeTable = buildChildFeeTable(parent, profitByRow);
      companies.push(c);
      return c;
    }

    function bizNo() {
      return (
        Math.floor(100 + Math.random() * 900) +
        "-" +
        Math.floor(10 + Math.random() * 90) +
        "-" +
        Math.floor(10000 + Math.random() * 90000)
      );
    }
    function phone() {
      return "010-" + Math.floor(1000 + Math.random() * 9000) + "-" + Math.floor(1000 + Math.random() * 9000);
    }
    function tel() {
      return "02-" + Math.floor(100 + Math.random() * 900) + "-" + Math.floor(1000 + Math.random() * 9000);
    }

    // ---------------- 총판 3개 ----------------
    var partner1 = pushAdminRegistered(
      "총판",
      "㈜대한총판",
      {
        bizNo: bizNo(),
        email: "daehan@partner.co.kr",
        phone: phone(),
        ceo: "김대한",
        tel: tel(),
        loginId: "partner1",
        loginPw: "1234"
      },
      "D+1",
      { d0: 1.9, d1: 2.1 }
    );

    var partner2 = pushAdminRegistered(
      "총판",
      "㈜코리아총판",
      {
        bizNo: bizNo(),
        email: "korea@partner.co.kr",
        phone: phone(),
        ceo: "이코리아",
        tel: tel(),
        loginId: "partner2",
        loginPw: "1234"
      },
      "D+0",
      { d0: 1.8, d1: 2.0 }
    );

    var partner3 = pushAdminRegistered(
      "총판",
      "㈜글로벌총판",
      {
        bizNo: bizNo(),
        email: "global@partner.co.kr",
        phone: phone(),
        ceo: "박글로벌",
        tel: tel(),
        loginId: "partner3",
        loginPw: "1234"
      },
      "D+1",
      { d0: 2.0, d1: 2.2 }
    );

    // ---------------- 어드민 직접 등록 가맹점 1건 (업체구분=가맹점 데모용) ----------------
    pushAdminRegistered(
      "가맹점",
      "㈜단독등록가맹점",
      {
        bizNo: bizNo(),
        email: "direct@merchant.co.kr",
        phone: phone(),
        ceo: "최직접",
        tel: tel()
      },
      "D+1",
      { d0: 2.3, d1: 2.5 },
      { urlCode: genCode(10), attachStatus: "미등록" }
    );

    // ---------------- 총판1 하부 ----------------
    var agency11 = pushChild(
      "영업사",
      "㈜한빛영업",
      { bizNo: bizNo(), email: "hanbit@agency.co.kr", phone: phone(), ceo: "정한빛", tel: tel(), loginId: "agency11", loginPw: "1234" },
      partner1
    );
    var agency12 = pushChild(
      "영업사",
      "㈜서울세일즈",
      { bizNo: bizNo(), email: "seoul@agency.co.kr", phone: phone(), ceo: "한서울", tel: tel(), loginId: "agency12", loginPw: "1234" },
      partner1
    );
    var agency13 = pushChild(
      "영업사",
      "㈜중부에이전시",
      { bizNo: bizNo(), email: "jungbu@agency.co.kr", phone: phone(), ceo: "오중부", tel: tel(), loginId: "agency13", loginPw: "1234" },
      partner1
    );
    pushChild("가맹점", "㈜대한마트", { bizNo: bizNo(), email: "mart@merchant.co.kr", phone: phone(), ceo: "황대한", tel: tel() }, partner1);
    pushChild("가맹점", "㈜퍼펙트편의점", { bizNo: bizNo(), email: "perfect@merchant.co.kr", phone: phone(), ceo: "신퍼펙", tel: tel() }, partner1);

    ["㈜별빛커피", "㈜모던델리"].forEach(function (n) {
      pushChild("가맹점", n, { bizNo: bizNo(), email: "shop" + Math.floor(Math.random()*999) + "@merchant.co.kr", phone: phone(), ceo: "대표" + n.slice(1, 3), tel: tel() }, agency11);
    });
    ["㈜청춘분식", "㈜소나무헤어샵"].forEach(function (n) {
      pushChild("가맹점", n, { bizNo: bizNo(), email: "shop" + Math.floor(Math.random()*999) + "@merchant.co.kr", phone: phone(), ceo: "대표" + n.slice(1, 3), tel: tel() }, agency12);
    });
    ["㈜청계문방구"].forEach(function (n) {
      pushChild("가맹점", n, { bizNo: bizNo(), email: "shop" + Math.floor(Math.random()*999) + "@merchant.co.kr", phone: phone(), ceo: "대표" + n.slice(1, 3), tel: tel() }, agency13);
    });

    // ---------------- 총판2 하부 ----------------
    var agency21 = pushChild(
      "영업사",
      "㈜미래에이전시",
      { bizNo: bizNo(), email: "mirae@agency.co.kr", phone: phone(), ceo: "서미래", tel: tel(), loginId: "agency21", loginPw: "1234" },
      partner2
    );
    var agency22 = pushChild(
      "영업사",
      "㈜퍼스트영업",
      { bizNo: bizNo(), email: "first@agency.co.kr", phone: phone(), ceo: "노퍼스", tel: tel(), loginId: "agency22", loginPw: "1234" },
      partner2
    );
    pushChild("가맹점", "㈜해피펫샵", { bizNo: bizNo(), email: "pet@merchant.co.kr", phone: phone(), ceo: "윤해피", tel: tel() }, partner2);
    pushChild("가맹점", "㈜우리동네정육점", { bizNo: bizNo(), email: "meat@merchant.co.kr", phone: phone(), ceo: "장우리", tel: tel() }, partner2);
    pushChild("가맹점", "㈜강남네일", { bizNo: bizNo(), email: "nail@merchant.co.kr", phone: phone(), ceo: "임강남", tel: tel() }, partner2);

    ["㈜행복베이커리", "㈜스마일세탁", "㈜그린테이블"].forEach(function (n) {
      pushChild("가맹점", n, { bizNo: bizNo(), email: "shop" + Math.floor(Math.random()*999) + "@merchant.co.kr", phone: phone(), ceo: "대표" + n.slice(1, 3), tel: tel() }, agency21);
    });
    ["㈜그린마트", "㈜파스타공방"].forEach(function (n) {
      pushChild("가맹점", n, { bizNo: bizNo(), email: "shop" + Math.floor(Math.random()*999) + "@merchant.co.kr", phone: phone(), ceo: "대표" + n.slice(1, 3), tel: tel() }, agency22);
    });

    // ---------------- 총판3 하부 ----------------
    var agency31 = pushChild(
      "영업사",
      "㈜탑세일즈",
      { bizNo: bizNo(), email: "top@agency.co.kr", phone: phone(), ceo: "권탑", tel: tel(), loginId: "agency31", loginPw: "1234" },
      partner3
    );
    var agency32 = pushChild(
      "영업사",
      "㈜코스모영업",
      { bizNo: bizNo(), email: "cosmo@agency.co.kr", phone: phone(), ceo: "문코스모", tel: tel(), loginId: "agency32", loginPw: "1234" },
      partner3
    );
    pushChild("가맹점", "㈜한강카페", { bizNo: bizNo(), email: "hangang@merchant.co.kr", phone: phone(), ceo: "배한강", tel: tel() }, partner3);
    pushChild("가맹점", "㈜상록문구", { bizNo: bizNo(), email: "sangrok@merchant.co.kr", phone: phone(), ceo: "구상록", tel: tel() }, partner3);
    pushChild("가맹점", "㈜든든철물점", { bizNo: bizNo(), email: "cheolmul@merchant.co.kr", phone: phone(), ceo: "안든든", tel: tel() }, partner3);

    ["㈜블루핏짐", "㈜예쁨플라워"].forEach(function (n) {
      pushChild("가맹점", n, { bizNo: bizNo(), email: "shop" + Math.floor(Math.random()*999) + "@merchant.co.kr", phone: phone(), ceo: "대표" + n.slice(1, 3), tel: tel() }, agency31);
    });
    ["㈜미소세탁소"].forEach(function (n) {
      pushChild("가맹점", n, { bizNo: bizNo(), email: "shop" + Math.floor(Math.random()*999) + "@merchant.co.kr", phone: phone(), ceo: "대표" + n.slice(1, 3), tel: tel() }, agency32);
    });

    return {
      companies: companies,
      admin: { loginNote: "어드민 데모 계정: 아무 아이디/비밀번호나 입력하면 로그인됩니다." }
    };
  }

  /* --------------------------- Store --------------------------- */

  var Store = {
    ROWS: ROWS,
    CONTRACT_STATUSES: CONTRACT_STATUSES,
    DEVICE_STATUSES: DEVICE_STATUSES,

    load: function () {
      var raw = null;
      try {
        raw = localStorage.getItem(STORAGE_KEY);
      } catch (e) {}
      if (raw) {
        try {
          this.db = JSON.parse(raw);
          return this.db;
        } catch (e) {}
      }
      this.db = seed();
      this.save();
      return this.db;
    },

    save: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      } catch (e) {}
    },

    reset: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      this.load();
    },

    all: function () {
      return this.db.companies;
    },

    getById: function (id) {
      return this.db.companies.find(function (c) {
        return c.id === id;
      });
    },

    getByCode: function (code) {
      return this.db.companies.find(function (c) {
        return c.urlCode === code;
      });
    },

    getChildren: function (parentId) {
      return this.db.companies.filter(function (c) {
        return c.parentId === parentId;
      });
    },

    getDescendants: function (id) {
      var self = this;
      var direct = this.getChildren(id);
      var all = direct.slice();
      direct.forEach(function (c) {
        all = all.concat(self.getDescendants(c.id));
      });
      return all;
    },

    countByType: function (type) {
      return this.db.companies.filter(function (c) {
        return c.type === type;
      }).length;
    },

    recentRegistrations: function (n) {
      return this.db.companies
        .slice()
        .sort(function (a, b) {
          return b.regDate.localeCompare(a.regDate);
        })
        .slice(0, n || 6);
    },

    /* 어드민이 업체(총판/영업자/가맹점) 등록 */
    adminAddCompany: function (data) {
      var c = {
        id: uid("c"),
        type: data.type,
        name: data.name,
        bizNo: data.bizNo,
        email: data.email,
        phone: data.phone,
        ceo: data.ceo,
        tel: data.tel,
        loginId: data.loginId || null,
        loginPw: data.loginPw || null,
        settleCycle: data.settleCycle,
        parentId: null,
        parentType: "어드민",
        urlCode: data.type === "가맹점" ? genCode(10) : null,
        attachStatus: data.type === "가맹점" ? "미등록" : "-",
        contractStatus: "심사요청",
        deviceStatus: "개통요청",
        regDate: todayStr(0),
        active: true,
        adminCost: data.adminCost
      };
      c.feeTable = resolveOwnFeeTable(c);
      this.db.companies.unshift(c);
      this.save();
      return c;
    },

    /* 총판/영업사가 하부업체(영업사/가맹점) 등록 */
    childAddCompany: function (parentId, data) {
      var parent = this.getById(parentId);
      var c = {
        id: uid("c"),
        type: data.type,
        name: data.name,
        bizNo: data.bizNo,
        email: data.email,
        phone: data.phone,
        ceo: data.ceo,
        tel: data.tel,
        loginId: data.loginId || null,
        loginPw: data.loginPw || null,
        settleCycle: parent.settleCycle,
        parentId: parent.id,
        parentType: parent.type,
        urlCode: data.type === "가맹점" ? genCode(10) : null,
        attachStatus: data.type === "가맹점" ? "미등록" : "-",
        contractStatus: "심사요청",
        deviceStatus: "개통요청",
        regDate: todayStr(0),
        active: true
      };
      c.feeTable = buildChildFeeTable(parent, data.profitByRow);
      this.db.companies.unshift(c);
      this.save();
      return c;
    },

    /* 어드민이 등록 후 원가(D+0/D+1)를 수정 — 해당 업체의 settleCycle 기준으로 feeTable.cost 재계산 */
    updateAdminCostRow: function (id, row, d0, d1) {
      var c = this.getById(id);
      if (!c || !c.adminCost) return;
      c.adminCost[row] = { d0: round1(d0), d1: round1(d1) };
      c.feeTable[row].cost = c.adminCost[row][cycleKey(c.settleCycle)];
      this.save();
    },

    /* 총판/영업사가 등록 후 하부업체의 수익/판매가를 수정 (원가는 고정) */
    updateChildFeeRow: function (id, row, profit, sale) {
      var c = this.getById(id);
      if (!c || !c.feeTable[row]) return;
      c.feeTable[row].profit = round1(profit);
      c.feeTable[row].sale = round1(sale);
      this.save();
    },

    setContractStatus: function (id, status) {
      var c = this.getById(id);
      if (c) {
        c.contractStatus = status;
        this.save();
      }
    },

    setDeviceStatus: function (id, status) {
      var c = this.getById(id);
      if (c) {
        c.deviceStatus = status;
        this.save();
      }
    },

    setAttachByCode: function (code) {
      var c = this.getByCode(code);
      if (c) {
        c.attachStatus = "등록";
        this.save();
        return c;
      }
      return null;
    },

    toggleActive: function (id) {
      var c = this.getById(id);
      if (c) {
        c.active = !c.active;
        this.save();
      }
    },

    /* ---------------- 세션 ---------------- */
    session: {
      get: function () {
        try {
          var raw = sessionStorage.getItem(SESSION_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          return null;
        }
      },
      set: function (data) {
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
        } catch (e) {}
      },
      clear: function () {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch (e) {}
      }
    },

    utils: { uid: uid, genCode: genCode, todayStr: todayStr, nowDateTimeStr: nowDateTimeStr, round1: round1 }
  };

  Store.load();
  global.OffPG = Store;
})(window);
