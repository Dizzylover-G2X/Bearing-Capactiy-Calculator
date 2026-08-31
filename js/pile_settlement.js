export function initPileSettlementModule(container) {
    const getVal = (id, defaultVal) => {
        try {
            return localStorage.getItem('geo_ps_' + id) ?? defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

    container.innerHTML = `
        <h3>1. 설계자료 입력 (기성말뚝 연직침하량 검토)</h3>
        
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 말뚝 및 지반 제원</div>
        <div class="input-grid" style="margin-bottom: 15px;">
            <div class="input-group">
                <label>말뚝 직경 D (m)</label>
                <input type="number" id="ps_D" value="${getVal('D', '0.800')}" step="0.001">
            </div>
            <div class="input-group">
                <label>말뚝 길이 L (m)</label>
                <input type="number" id="ps_L" value="${getVal('L', '10.0')}" step="0.1">
            </div>
            <div class="input-group">
                <label>순 단면적 A_body (m²)</label>
                <input type="number" id="ps_A" value="${getVal('A', '0.23845')}" step="0.00001">
            </div>
            <div class="input-group">
                <label>탄성계수 Ep (kN/m²)</label>
                <input type="number" id="ps_Ep" value="${getVal('Ep', '39200000')}" step="100000">
            </div>
            <div class="input-group">
                <label>선단 전달하중 Q_pa (kN)</label>
                <input type="number" id="ps_Qpa" value="${getVal('Qpa', '1473.43')}" step="10">
            </div>
            <div class="input-group">
                <label>주면 전달하중 Q_fs (kN)</label>
                <input type="number" id="ps_Qfs" value="${getVal('Qfs', '589.37')}" step="10">
            </div>
            <div class="input-group">
                <label>단위면적당 극한선단지지력 q_b (kN/m²)</label>
                <input type="number" id="ps_qb" value="${getVal('qb', '10000.0')}" step="100">
            </div>
            <div class="input-group" style="background-color: #fcf3cf; border-color: #f1c40f;">
                <label style="color: #d4ac0d;">허용 침하량 (mm)</label>
                <input type="number" id="ps_allow" value="${getVal('allow', '25.0')}" step="0.1">
            </div>
        </div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 반경험적 방법(Vesic) 산정 계수</div>
        <div class="input-grid" style="background-color: #fdfefe; padding: 12px; border-radius: 6px; border: 1px solid #bdc3c7; margin-bottom: 15px;">
            <div class="input-group" style="background-color: #fff;">
                <label>주면마찰 분포계수 α_s</label>
                <select id="ps_alpha_s" style="width:100%; padding:8px 4px; border:1px solid #ccc; border-radius:4px; text-align:center; font-size:0.95em;">
                    <option value="0.50" ${getVal('alpha_s', '0.67') === '0.50' ? 'selected' : ''}>0.50 (균등/포물선 분포)</option>
                    <option value="0.67" ${getVal('alpha_s', '0.67') === '0.67' ? 'selected' : ''}>0.67 (삼각형 분포)</option>
                </select>
            </div>
            <div class="input-group" style="background-color: #fff;">
                <label>경험계수 C_p</label>
                <input type="number" id="ps_Cp" value="${getVal('Cp', '0.09')}" step="0.01" title="사질토 굴착말뚝: 0.09~0.18 등">
            </div>
        </div>

        <button class="action-btn" id="calc-ps-btn">기성말뚝 침하량 산정 및 비교</button>
        <div id="ps-result" class="result-box"></div>
    `;

    // 이벤트 리스너 바인딩
    const inputs = container.querySelectorAll('.input-grid input, .input-grid select');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            let key = this.id.replace('ps_', '');
            try { localStorage.setItem('geo_ps_' + key, this.value); } catch(e){}
        });
    });

    container.querySelector('#calc-ps-btn').addEventListener('click', calculatePileSettlement);
}

function calculatePileSettlement() {
    const D = parseFloat(document.getElementById('ps_D').value);
    const L = parseFloat(document.getElementById('ps_L').value);
    const A = parseFloat(document.getElementById('ps_A').value);
    const Ep = parseFloat(document.getElementById('ps_Ep').value);
    const Qpa = parseFloat(document.getElementById('ps_Qpa').value);
    const Qfs = parseFloat(document.getElementById('ps_Qfs').value);
    const qb = parseFloat(document.getElementById('ps_qb').value);
    const allowSettle = parseFloat(document.getElementById('ps_allow').value);
    
    const alpha_s = parseFloat(document.getElementById('ps_alpha_s').value);
    const Cp = parseFloat(document.getElementById('ps_Cp').value);

    // 총 작용 하중
    const Qva = Qpa + Qfs;

    // ---------------------------------------------------------
    // 1. 반경험적 방법 (Vesic, 1977 / 구조물기초설계기준해설)
    // ---------------------------------------------------------
    // (1) 말뚝자체의 압축으로 인한 침하 (Ss)
    const Ss_m = ((Qpa + alpha_s * Qfs) * L) / (A * Ep);
    const Ss_mm = Ss_m * 1000;

    // (2) 말뚝선단 하중에 의한 침하 (Sp)
    const Sp_m = (Cp * Qpa) / (D * qb);
    const Sp_mm = Sp_m * 1000;

    // (3) 말뚝주변 지반침하로 인한 말뚝 침하 (Sps)
    const Cs = (0.93 + 0.16 * Math.sqrt(L / D)) * Cp;
    const Sps_m = (Cs * Qfs) / (L * qb);
    const Sps_mm = Sps_m * 1000;

    const S_vesic = Ss_mm + Sp_mm + Sps_mm;

    // ---------------------------------------------------------
    // 2. 경험적 방법 (CFEM, 1992 / 강관말뚝 설계와 시공)
    // ---------------------------------------------------------
    // St = B/100 + (Qva * L) / (A * Ep)
    // (D 단위가 m이므로 100으로 나누면 m단위가 됨. mm 환산을 위해 1000을 곱함 -> 10 * D)
    const term1_cfem_mm = (D / 100) * 1000; 
    const term2_cfem_m = (Qva * L) / (A * Ep);
    const term2_cfem_mm = term2_cfem_m * 1000;
    
    const S_cfem = term1_cfem_mm + term2_cfem_mm;

    // 최종 판정 (보수적인 최대값 적용)
    const applied_S = Math.max(S_vesic, S_cfem);
    const status = applied_S <= allowSettle ? "안정 (O.K)" : "불안정 (N.G)";

    const resultDiv = document.getElementById('ps-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="section-title">[연직침하량 종합 판정 결과]</div>
        <div class="table-container">
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>반경험적 방법 (Vesic)</th>
                        <th>경험적 방법 (CFEM)</th>
                        <th>적용 침하량 (Max)</th>
                        <th>허용 침하량</th>
                        <th>검토 결과</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${S_vesic.toFixed(3)} mm</td>
                        <td>${S_cfem.toFixed(3)} mm</td>
                        <td style="font-weight:bold; color:#8e44ad;">${applied_S.toFixed(3)} mm</td>
                        <td>${allowSettle.toFixed(1)} mm</td>
                        <td style="font-weight:bold; color:${applied_S <= allowSettle ? '#27ae60' : '#c0392b'};">${status}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section-title">[검증 1] 반경험적 방법에 의한 침하량 산정 상세 (구조물기초설계기준해설)</div>
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px;">
            <strong>(1) 말뚝자체의 압축으로 인한 침하 (S<sub>s</sub>)</strong><br>
            • S<sub>s</sub> = (Q<sub>pa</sub> + &alpha;<sub>s</sub> &times; Q<sub>fs</sub>) &times; L / (A<sub>body</sub> &times; E<sub>body</sub>)<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= (${Qpa.toLocaleString()} + ${alpha_s} &times; ${Qfs.toLocaleString()}) &times; ${L} / (${A} &times; ${Ep.toLocaleString()})<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= <strong>${Ss_mm.toFixed(3)} mm</strong><br><br>

            <strong>(2) 말뚝선단 하중에 의한 침하 (S<sub>p</sub>)</strong><br>
            • S<sub>p</sub> = (C<sub>p</sub> &times; Q<sub>pa</sub>) / (B &times; q<sub>b</sub>)<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= (${Cp} &times; ${Qpa.toLocaleString()}) / (${D} &times; ${qb.toLocaleString()})<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= <strong>${Sp_mm.toFixed(3)} mm</strong><br><br>

            <strong>(3) 말뚝주변 지반침하로 인한 말뚝 침하 (S<sub>ps</sub>)</strong><br>
            • 계수 C<sub>s</sub> = (0.93 + 0.16 &times; &radic;(L / B)) &times; C<sub>p</sub> = (0.93 + 0.16 &times; &radic;(${L} / ${D})) &times; ${Cp} = <strong>${Cs.toFixed(3)}</strong><br>
            • S<sub>ps</sub> = (C<sub>s</sub> &times; Q<sub>fs</sub>) / (L &times; q<sub>b</sub>)<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= (${Cs.toFixed(3)} &times; ${Qfs.toLocaleString()}) / (${L} &times; ${qb.toLocaleString()})<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= <strong>${Sps_mm.toFixed(3)} mm</strong><br><br>

            <strong>▶ 반경험적 방법 총 침하량 (S)</strong> = S<sub>s</sub> + S<sub>p</sub> + S<sub>ps</sub> = ${Ss_mm.toFixed(3)} + ${Sp_mm.toFixed(3)} + ${Sps_mm.toFixed(3)} = <span style="font-weight:bold; color:#2980b9;">${S_vesic.toFixed(3)} mm</span>
        </div>

        <div class="section-title">[검증 2] 경험적 방법에 의한 침하량 산정 상세 (CFEM, 1992)</div>
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px;">
            <strong>(1) 말뚝 직경에 의한 경험적 침하항</strong><br>
            • B / 100 = ${D} / 100 (m) = <strong>${term1_cfem_mm.toFixed(3)} mm</strong><br><br>

            <strong>(2) 말뚝의 탄성 압축항</strong><br>
            • 총 작용하중 (Q<sub>va</sub>) = Q<sub>pa</sub> + Q<sub>fs</sub> = ${Qpa.toLocaleString()} + ${Qfs.toLocaleString()} = <strong>${Qva.toLocaleString()} kN</strong><br>
            • (Q<sub>va</sub> &times; L) / (A &times; E<sub>p</sub>) = (${Qva.toLocaleString()} &times; ${L}) / (${A} &times; ${Ep.toLocaleString()})<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= <strong>${term2_cfem_mm.toFixed(3)} mm</strong><br><br>

            <strong>▶ 경험적 방법 총 침하량 (S<sub>t</sub>)</strong> = ${term1_cfem_mm.toFixed(3)} + ${term2_cfem_mm.toFixed(3)} = <span style="font-weight:bold; color:#2980b9;">${S_cfem.toFixed(3)} mm</span>
        </div>
    `;
}
