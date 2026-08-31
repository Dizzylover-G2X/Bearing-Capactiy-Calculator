export function initPileSettlementModule(container) {
    const getVal = (id, defaultVal) => localStorage.getItem('geo_ps_' + id) ?? defaultVal;

    container.innerHTML = `
        <h3>1. 설계자료 입력 (말뚝 침하량 검토 - Vesic 탄성이론)</h3>
        
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 말뚝 및 지반 탄성 제원</div>
        <div class="input-grid" style="margin-bottom: 15px;">
            <div class="input-group">
                <label>말뚝 직경 D (m)</label>
                <input type="number" id="ps_D" value="${getVal('D', '0.50')}" step="0.01">
            </div>
            <div class="input-group">
                <label>말뚝 길이 L (m)</label>
                <input type="number" id="ps_L" value="${getVal('L', '10.00')}" step="0.1">
            </div>
            <div class="input-group">
                <label>단면적 Ap (m²)</label>
                <input type="number" id="ps_Ap" value="${getVal('Ap', '0.1963')}" step="0.0001">
            </div>
            <div class="input-group">
                <label>말뚝 탄성계수 Ep (kN/m²)</label>
                <input type="number" id="ps_Ep" value="${getVal('Ep', '28000000')}" step="100000">
            </div>
            <div class="input-group">
                <label>선단 전달하중 Qwp (kN)</label>
                <input type="number" id="ps_Qwp" value="${getVal('Qwp', '300.0')}" step="10">
            </div>
            <div class="input-group">
                <label>주면 전달하중 Qws (kN)</label>
                <input type="number" id="ps_Qws" value="${getVal('Qws', '500.0')}" step="10">
            </div>
            <div class="input-group">
                <label>극한 선단지지력 qp (kN/m²)</label>
                <input type="number" id="ps_qp" value="${getVal('qp', '10000.0')}" step="100">
            </div>
            <div class="input-group">
                <label>선단 침하계수 Cp</label>
                <input type="number" id="ps_Cp" value="${getVal('Cp', '0.05')}" step="0.01">
            </div>
            <div class="input-group">
                <label>주면마찰 분포계수 ξ</label>
                <input type="number" id="ps_xi" value="${getVal('xi', '0.60')}" step="0.05">
            </div>
            <div class="input-group">
                <label>군말뚝 가상폭 Bg (m)</label>
                <input type="number" id="ps_Bg" value="${getVal('Bg', '3.00')}" step="0.1">
            </div>
            <div class="input-group" style="background-color: #fcf3cf; border-color: #f1c40f; grid-column: span 2;">
                <label style="color: #d4ac0d;">허용 침하량 (mm)</label>
                <input type="number" id="ps_allow" value="${getVal('allow', '25.0')}" step="0.1">
            </div>
        </div>

        <button class="action-btn" id="calc-ps-btn">말뚝 침하량 산정하기</button>
        <div id="ps-result" class="result-box"></div>
    `;

    // 이벤트 리스너 바인딩
    container.querySelectorAll('.input-grid input').forEach(input => {
        input.addEventListener('change', function() {
            let key = this.id.replace('ps_', '');
            localStorage.setItem('geo_ps_' + key, this.value);
        });
    });

    container.querySelector('#calc-ps-btn').addEventListener('click', calculatePileSettlement);
}

function calculatePileSettlement() {
    const D = parseFloat(document.getElementById('ps_D').value);
    const L = parseFloat(document.getElementById('ps_L').value);
    const Ap = parseFloat(document.getElementById('ps_Ap').value);
    const Ep = parseFloat(document.getElementById('ps_Ep').value);
    const Qwp = parseFloat(document.getElementById('ps_Qwp').value);
    const Qws = parseFloat(document.getElementById('ps_Qws').value);
    const qp = parseFloat(document.getElementById('ps_qp').value);
    const Cp = parseFloat(document.getElementById('ps_Cp').value);
    const xi = parseFloat(document.getElementById('ps_xi').value);
    const Bg = parseFloat(document.getElementById('ps_Bg').value);
    const allowSettle = parseFloat(document.getElementById('ps_allow').value);

    // 1. 단일말뚝 침하량 산정
    const S1 = ((Qwp + xi * Qws) * L) / (Ap * Ep); // m
    const S2 = (Cp * Qwp) / (D * qp); // m
    const Cs = (0.93 + 0.16 * Math.sqrt(L / D)) * Cp;
    const S3 = (Cs * Qws) / (L * qp); // m

    const S1_mm = S1 * 1000;
    const S2_mm = S2 * 1000;
    const S3_mm = S3 * 1000;
    const S_total_mm = S1_mm + S2_mm + S3_mm;

    // 2. 군말뚝 침하량 산정
    const S_group_mm = S_total_mm * Math.sqrt(Bg / D);

    const passSingle = S_total_mm <= allowSettle ? "O.K" : "N.G";
    const passGroup = S_group_mm <= allowSettle ? "O.K" : "N.G";

    const resultDiv = document.getElementById('ps-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="section-title">[말뚝 침하량 검토 요약 결과]</div>
        <div class="table-container">
            <table class="summary-table">
                <tr>
                    <th>구분</th>
                    <th>산정 침하량 (mm)</th>
                    <th>허용 침하량 (mm)</th>
                    <th>판정</th>
                </tr>
                <tr>
                    <td><strong>단일말뚝 침하량 (S)</strong></td>
                    <td style="font-weight:bold; color:#2980b9;">${S_total_mm.toFixed(2)} mm</td>
                    <td>${allowSettle.toFixed(1)} mm</td>
                    <td style="font-weight:bold; color:${passSingle === 'O.K' ? '#27ae60' : '#c0392b'};">${passSingle}</td>
                </tr>
                <tr>
                    <td><strong>군말뚝 침하량 (S_g)</strong></td>
                    <td style="font-weight:bold; color:#8e44ad;">${S_group_mm.toFixed(2)} mm</td>
                    <td>${allowSettle.toFixed(1)} mm</td>
                    <td style="font-weight:bold; color:${passGroup === 'O.K' ? '#27ae60' : '#c0392b'};">${passGroup}</td>
                </tr>
            </table>
        </div>

        <div class="section-title">[상세 산정 내역 (Vesic 탄성이론)]</div>
        <div class="calc-step">
            • <strong>말뚝 축 변형량 (S₁) :</strong> ${S1_mm.toFixed(3)} mm<br>
            &nbsp;&nbsp;&nbsp;&nbsp;식: [(Qwp + ξ·Qws)·L] / (Ap·Ep) = [(${Qwp} + ${xi}×${Qws}) × ${L}] / (${Ap} × ${Ep})<br><br>
            • <strong>선단부 하중 전달 침하량 (S₂) :</strong> ${S2_mm.toFixed(3)} mm<br>
            &nbsp;&nbsp;&nbsp;&nbsp;식: (Cp·Qwp) / (D·qp) = (${Cp} × ${Qwp}) / (${D} × ${qp})<br><br>
            • <strong>주면마찰 하중 전달 침하량 (S₃) :</strong> ${S3_mm.toFixed(3)} mm<br>
            &nbsp;&nbsp;&nbsp;&nbsp;식: (Cs·Qws) / (L·qp) (단, Cs = ${Cs.toFixed(4)})<br><br>
            • <strong>총 단일말뚝 침하량 (S) :</strong> S₁ + S₂ + S₃ = <strong>${S_total_mm.toFixed(2)} mm</strong><br>
            • <strong>군말뚝 침하량 (S_g) :</strong> S × √(Bg / D) = ${S_total_mm.toFixed(2)} × √(${Bg} / ${D}) = <strong>${S_group_mm.toFixed(2)} mm</strong>
        </div>
    `;
}
