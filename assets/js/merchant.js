/* ==========================================================================
   OFF PG 가맹점 신청 웹 솔루션 — 가맹점 외부 신청 URL 흐름 (/merchant/#{10자리코드})
   Step 1: 서류 업로드 · 약관동의  →  Step 2: 휴대폰 OTP 본인인증  →  Step 3: 완료
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("app-root");
  var code = window.location.hash.replace("#", "").trim();
  var company = code ? OffPG.getByCode(code) : null;

  if (!company) {
    root.innerHTML =
      '<div class="mc-head">OFF PG 가맹점 신청</div>' +
      '<div class="mc-body"><div class="complete-wrap">' +
      '<h2>유효하지 않은 신청 링크입니다</h2>' +
      '<div class="desc">전달받으신 가맹점 신청 URL(10자리 코드)을 다시 확인해주세요.</div>' +
      "</div></div>";
    return;
  }

  var uploads = { biz: false, id: false, bank: false };
  var agree1 = false;
  var agree2 = false;
  var otpVerified = false;
  var timerHandle = null;
  var timerSeconds = 179;
  var otpSent = false;

  function fmtTime(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }

  function renderStep1() {
    root.innerHTML =
      '<div class="mc-head">OFF PG 가맹점 신청</div>' +
      '<div class="mc-body">' +
      '<div class="greeting">' +
      '<div class="company">' + OffPGUI.escapeHtml(company.name) + ' 귀하</div>' +
      '<div class="desc">아래 서류를 첨부하고 약관에 동의해주세요</div>' +
      "</div>" +
      uploadBox("biz", "사업자등록증") +
      uploadBox("id", "대표자 신분증") +
      uploadBox("bank", "통장사본") +
      '<div style="border-top:1px solid var(--border); margin: 18px 0 16px;"></div>' +
      '<div class="checkbox-row"><input type="checkbox" id="chk1" /><label for="chk1">[필수] 가맹점 신청 동의</label></div>' +
      '<div class="checkbox-row" style="margin-top:10px;">' +
      '<input type="checkbox" id="chk2" />' +
      '<label for="chk2">[필수] 개인정보 이용제공 동의 <a href="#" class="link" id="terms-link">약관 전문 보기</a></label>' +
      "</div>" +
      '<button class="btn btn-primary btn-block btn-lg" id="btn-next" style="margin-top:22px;" disabled>저장 (다음)</button>' +
      '<div class="close-note">저장 시 휴대폰 본인인증(OTP) 화면으로 이동합니다</div>' +
      "</div>";

    ["biz", "id", "bank"].forEach(function (key) {
      document.getElementById("dz-" + key).addEventListener("click", function () {
        uploads[key] = true;
        renderStep1();
      });
    });

    document.getElementById("chk1").checked = agree1;
    document.getElementById("chk2").checked = agree2;
    document.getElementById("chk1").addEventListener("change", function (e) {
      agree1 = e.target.checked;
      updateNextBtn();
    });
    document.getElementById("chk2").addEventListener("change", function (e) {
      agree2 = e.target.checked;
      updateNextBtn();
    });
    document.getElementById("terms-link").addEventListener("click", function (e) {
      e.preventDefault();
      OffPGUI.openModal(
        '<div class="modal-head">개인정보 이용제공 동의 (전문)</div>' +
        '<div class="modal-body" style="font-size:12.5px; color:var(--text-sub); line-height:1.8;">' +
        "본 약관은 데모용 목업 문서입니다. 실제 서비스에서는 개인정보보호법 등 관계 법령에 따른 " +
        "수집 항목, 이용 목적, 보유 및 이용기간, 제3자 제공 내역 등이 명시됩니다." +
        "</div>" +
        '<div class="modal-foot"><button class="btn" data-close-modal>닫기</button></div>'
      );
    });
    document.getElementById("btn-next").addEventListener("click", function () {
      if (agree1 && agree2) renderStep2();
    });
    updateNextBtn();
  }

  function updateNextBtn() {
    var btn = document.getElementById("btn-next");
    if (!btn) return;
    btn.disabled = !(agree1 && agree2);
  }

  function uploadBox(key, label) {
    var done = uploads[key];
    return (
      '<div class="upload-box">' +
      '<div class="up-label">' + label + "</div>" +
      '<div class="upload-dropzone" id="dz-' + key + '">' +
      (done
        ? '<div class="arrow" style="color:var(--green);">✓</div><div class="filename">' + label + ".pdf 업로드 완료</div>"
        : '<div class="arrow">⌃</div><div class="browse-btn">찾아보기</div>') +
      "</div></div>"
    );
  }

  function renderStep2() {
    root.innerHTML =
      '<div class="mc-head">OFF PG 가맹점 신청</div>' +
      '<div class="mc-body">' +
      '<div class="otp-title">휴대폰 본인인증</div>' +
      '<div class="otp-desc">' + company.phone + ' 으로 전송된<br/>인증번호 6자리를 입력해주세요</div>' +
      '<div class="otp-select-row"><label>생년월일<span class="req">*</span></label><input type="text" id="birth" placeholder="YYMMDD" maxlength="6" /></div>' +
      '<div class="otp-select-row"><label>성별<span class="req">*</span></label>' +
      '<div class="otp-toggle" id="gender-toggle"><button type="button" data-v="남자" class="active">남자</button><button type="button" data-v="여자">여자</button></div></div>' +
      '<div class="otp-select-row"><label>내외국인<span class="req">*</span></label>' +
      '<div class="otp-toggle" id="nat-toggle"><button type="button" data-v="내국인" class="active">내국인</button><button type="button" data-v="외국인">외국인</button></div></div>' +
      '<div class="otp-select-row"><label>통신사<span class="req">*</span></label>' +
      '<select id="carrier"><option>KT</option><option>SKT</option><option>LG U+</option><option>알뜰폰</option></select></div>' +
      '<div class="checkbox-row">' +
      '<input type="checkbox" id="chk3" />' +
      '<label for="chk3">휴대폰 본인인증 약관동의 <a href="#" class="link" id="terms-link2">전문보기</a></label>' +
      '</div>' +
      '<button class="btn btn-block" style="background:#2957A4;color:#fff;border-color:#2957A4;margin-top:14px;" id="btn-confirm">확인</button>' +
      '<div style="border-top:1px solid var(--border); margin: 22px 0 18px;"></div>' +
      '<div class="otp-boxes" id="otp-boxes"></div>' +
      '<div class="otp-timer" id="otp-timer">남은시간 -:--</div>' +
      '<button class="btn btn-primary btn-block btn-lg" id="btn-verify" disabled>인증확인</button>' +
      '<div class="otp-resend" id="btn-resend">인증번호를 받지 못하셨나요? 재전송</div>' +
      '<div class="close-note">인증 완료 시 리스트의 첨부파일 상태가 &#39;미등록&#39; → &#39;등록&#39;으로 자동 변경됩니다</div>' +
      "</div>";

    for (var g of ["gender-toggle", "nat-toggle"]) {
      (function (groupId) {
        document.getElementById(groupId).querySelectorAll("button").forEach(function (btn) {
          btn.addEventListener("click", function () {
            document.getElementById(groupId).querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");
          });
        });
      })(g);
    }

    document.getElementById("terms-link2").addEventListener("click", function (e) {
      e.preventDefault();
      OffPGUI.openModal(
        '<div class="modal-head">휴대폰 본인인증 약관 (전문)</div>' +
        '<div class="modal-body" style="font-size:12.5px; color:var(--text-sub); line-height:1.8;">' +
        "본 약관은 데모용 목업 문서입니다. 실제 서비스에서는 본인확인기관을 통한 휴대폰 본인인증 절차 및 " +
        "관련 고유식별정보 처리에 대한 동의 내용이 명시됩니다." +
        "</div>" +
        '<div class="modal-foot"><button class="btn" data-close-modal>닫기</button></div>'
      );
    });

    var otpBoxesEl = document.getElementById("otp-boxes");
    for (var i = 0; i < 6; i++) {
      var inp = document.createElement("input");
      inp.type = "text";
      inp.maxLength = 1;
      inp.inputMode = "numeric";
      inp.disabled = true;
      inp.dataset.idx = i;
      otpBoxesEl.appendChild(inp);
    }
    wireOtpBoxes();

    document.getElementById("btn-confirm").addEventListener("click", function () {
      var birth = document.getElementById("birth").value.trim();
      var chk3 = document.getElementById("chk3").checked;
      if (!birth || birth.length < 6) {
        OffPGUI.toast("생년월일을 입력해주세요.");
        return;
      }
      if (!chk3) {
        OffPGUI.toast("휴대폰 본인인증 약관에 동의해주세요.");
        return;
      }
      startOtp();
    });

    document.getElementById("btn-verify").addEventListener("click", function () {
      tryVerify(true);
    });
    document.getElementById("btn-resend").addEventListener("click", function () {
      if (!otpSent) return;
      timerSeconds = 179;
      OffPGUI.toast("인증번호가 재전송되었습니다.");
      restartTimer();
    });
  }

  function wireOtpBoxes() {
    var boxes = Array.prototype.slice.call(document.querySelectorAll("#otp-boxes input"));
    boxes.forEach(function (box, idx) {
      box.addEventListener("input", function () {
        box.value = box.value.replace(/[^0-9]/g, "");
        if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
        tryVerify(false);
      });
      box.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !box.value && idx > 0) boxes[idx - 1].focus();
      });
    });
  }

  function startOtp() {
    otpSent = true;
    document.querySelectorAll("#otp-boxes input").forEach(function (box) {
      box.disabled = false;
    });
    document.getElementById("btn-verify").disabled = false;
    document.querySelectorAll("#otp-boxes input")[0].focus();
    OffPGUI.toast("인증번호가 전송되었습니다.");
    timerSeconds = 179;
    restartTimer();
  }

  function restartTimer() {
    if (timerHandle) clearInterval(timerHandle);
    updateTimerDisplay();
    timerHandle = setInterval(function () {
      timerSeconds--;
      if (timerSeconds < 0) {
        clearInterval(timerHandle);
        timerSeconds = 0;
        var t = document.getElementById("otp-timer");
        if (t) t.textContent = "인증시간이 만료되었습니다. 재전송해주세요.";
        return;
      }
      updateTimerDisplay();
    }, 1000);
  }

  function updateTimerDisplay() {
    var t = document.getElementById("otp-timer");
    if (t) t.textContent = "남은시간 " + fmtTime(timerSeconds);
  }

  function tryVerify(forced) {
    var boxes = Array.prototype.slice.call(document.querySelectorAll("#otp-boxes input"));
    var val = boxes.map(function (b) { return b.value; }).join("");
    if (val.length === 6 || forced) {
      if (!otpSent) return;
      if (val.length < 6 && forced) {
        OffPGUI.toast("인증번호 6자리를 모두 입력해주세요.");
        return;
      }
      if (timerHandle) clearInterval(timerHandle);
      otpVerified = true;
      OffPG.setAttachByCode(code);
      renderStep3();
    }
  }

  function renderStep3() {
    root.innerHTML =
      '<div class="mc-head">OFF PG 가맹점 신청</div>' +
      '<div class="mc-body">' +
      '<div class="complete-wrap">' +
      '<div class="complete-check"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M5 13l4 4L19 7" stroke="#2E9E5B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<h2>신청이 완료되었습니다</h2>' +
      '<div class="desc">제출하신 서류 확인 후<br/>담당자가 계약 절차를 안내드립니다</div>' +
      '<div class="summary-card-box">' +
      '<div class="row"><span class="k">신청업체명</span><span class="v">' + OffPGUI.escapeHtml(company.name) + '</span></div>' +
      '<div class="row"><span class="k">접수일시</span><span class="v">' + OffPG.utils.nowDateTimeStr() + '</span></div>' +
      '<div class="row"><span class="k">진행상태</span><span class="v">' + OffPGUI.badge(company.contractStatus, "navy") + '</span></div>' +
      "</div>" +
      '<div class="close-note">본 창은 닫으셔도 됩니다</div>' +
      "</div></div>";
  }

  renderStep1();
})();
