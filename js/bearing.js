import { generalTable, localTable, modifiedTable } from './data.js';

function interpolateFactors(phiInput, table) {
    if (phiInput <= table[0].phi) {
        return { Nc: table[0].Nc, Nq: table[0].Nq, Ng: table[0].Ng };
    }
    const last = table[table.length - 1];
    if (phiInput >= last.phi) {
        return { Nc: last.Nc, Nq: last.Nq, Ng: last.Ng };
    }

    for (let i = 0; i < table.length - 1; i++) {
        let lower = table[i];
        let upper = table[i + 1];
        if (phiInput >= lower.phi && phiInput <= upper.phi) {
            let ratio = (phiInput - lower.phi) / (upper.phi - lower.phi);
            let Nc = lower.Nc + ratio * (upper.Nc - lower.Nc);
            let Nq = lower.Nq + ratio * (upper.Nq - lower.Nq);
            let Ng = lower.Ng + ratio * (upper.Ng - lower.Ng);
            return { Nc, Nq, Ng };
        }
    }
    return { Nc: table[5].Nc, Nq: table[5].Nq, Ng: table[5].Ng };
}

export function initBearingModule(container) {
    container.innerHTML = `
        <h3>1. 설계자료 입력</h3>
        <div class="input-grid">
            <div class="input-group">
                <label>기초 길이 L (m)</label>
                <input type="number" id="L" value="2.00" step="0.01">
            </div>
            <div class="input-group">
                <label>기초 폭 B (m)</label>
                <input type="number" id="B" value="1.82" step="0.01">
            </div>
            <div class="input-group">
                <label>근입 깊이 Df (m)</label>
                <input type="number" id="Df" value="2.20" step="0.01">
            </div>
            <div class="input-group">
                <label>지하수위 WL (GL.-m)</label>
                <input type="number" id="WL" value="3.38" step="0.01">
            </div>
            <div class="input-group">
                <label>지지층 점착력 c (kN/m²)</label>
                <input type="number" id="c" value="3.00" step="0.01">
            </div>
            <div class="input-group">
                <label>지지층 내부마찰각 Φ (°)</label>
                <input type="number" id="phi" value="25.00" step="0.01">
            </div>
            <div class="input-group">
                <label>상부층 단위중량 γ1 (kN/m³)</label>
                <input type="number" id="gamma1" value="18.00" step="0.01">
            </div>
            <div class="input-group">
                <label>지지층 단위중량 γ2 (kN/m³)</label>
                <input type="number" id="gamma2" value="18.00" step="0.01">
            </div>
        </div>
        
        <p style="font-size: 0.85em; color: #555;">※ 물의 단위중량 = 9.807 kN/m³ 적용. 안전율 FS = 3 적용.</p>
        <button class="action-btn" id="calc-bearing-btn">모든 공식 한 번에 비교 계산하기</button>
        <div id="result" class="result-box"></div>
    `;

    // 입력값 포커스 아웃 시 소수점 둘째 자리 자동 포맷팅
    container.querySelectorAll('.input-grid input').forEach(input => {
        input.addEventListener('blur', function() {
            let val = parseFloat(this.value);
            if (!isNaN(val)) {
                this.value = val.toFixed(2);
            }
        });
    });

    container.querySelector('#calc-bearing-btn').addEventListener('click', calculateAllBearingCapacities);
}

function calculateAllBearingCapacities() {
    const L = parseFloat(document.getElementById('L').value);
    const B = parseFloat(document.getElementById('B').value);
    const Df = parseFloat(document.getElementById('Df').value);
    const WL = parseFloat(document.getElementById('WL').value);
    const c_in = parseFloat(document.getElementById('c').value);
    const phi_in = parseFloat(document.getElementById('phi').value);
    const gamma1_in = parseFloat(document.getElementById('gamma1').value);
    const gamma2_in = parseFloat(document.getElementById('gamma2').value);
    
    const gamma_w = 9.807;

    let gamma1_eff = gamma1_in;
    let log1 = "";
    const gamma1_sub = gamma1_in - gamma_w;
    if (WL <= 0) {
        gamma1_eff = gamma1_sub;
        log1 = "지하수위 지표면(0m) 위치: 전구간 수중단위중량 적용";
    } else if (WL >= Df) {
        gamma1_eff = gamma1_in;
        log1 = "지하수위 근입깊이(Df) 하부 위치: 건조/습윤 단위중량 적용";
    } else {
        gamma1_eff = gamma1_sub + gamma_w * (WL / Df);
        log1 = "지하수위 지표~Df 사이 위치: 1차식 선형 보간 적용";
    }

    let gamma2_eff = gamma2_in;
    let log2 = "";
    const gamma2_sub = gamma2_in - gamma_w;
    const Df_plus_B = Df + B;
    if (WL <= Df) {
        gamma2_eff = gamma2_sub;
        log2 = "지하수위 기초저면(Df) 상부 위치: 전구간 수중단위중량 적용";
    } else if (WL >= Df_plus_B) {
        gamma2_eff = gamma2_in;
        log2 = "지하수위 기초저면+폭(Df+B) 하부 위치: 전구간 원 단위중량 적용";
    } else {
        gamma2_eff = gamma2_sub + gamma_w * ((WL - Df) / B);
        log2 = "지하수위 Df~Df+B 사이 위치: 1차식 선형 보간 적용";
    }

    const q = Df * gamma1_eff;
    const alpha = 1 + 0.3 * (B / L);
    const beta = 0.5 - 0.1 * (B / L);

    const c_local = (2.0 / 3.0) * c_in;
    const phi_rad = phi_in * (Math.PI / 180);
    const phi_local = Math.atan((2.0 / 3.0) * Math.tan(phi_rad)) * (180 / Math.PI);

    // 1. 전반전단파괴
    const f_gen = interpolateFactors(phi_in, generalTable);
    const term1_g = alpha * c_in * f_gen.Nc;
    const term2_g = q * f_gen.Nq;
    const term3_g = beta * gamma2_eff * B * f_gen.Ng;
    const q_ult_g = term1_g + term2_g + term3_g;
    const q_all_g = q_ult_g / 3.0;

    // 2. 국부전단파괴
    const f_loc = interpolateFactors(phi_in, localTable);
    const term1_l = alpha * c_local * f_loc.Nc;
    const term2_l = q * f_loc.Nq;
    const term3_l = beta * gamma2_eff * B * f_loc.Ng;
    const q_ult_l = term1_l + term2_l + term3_l;
    const q_all_l = q_ult_l / 3.0;

    // 3. Terzaghi 수정 지지력 공식
    const f_mod = interpolateFactors(phi_in, modifiedTable);
    const term1_m = alpha * c_local * f_mod.Nc;
    const term2_m = q * f_mod.Nq;
    const term3_m = beta * gamma2_eff * B * f_mod.Ng;
    const q_ult_m = term1_m + term2_m + term3_m;
    const q_all_m = q_ult_m / 3.0;

    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="section-title">[종합 비교 요약 결과] (안전율 FS = 3)</div>
        <div class="table-container">
            <table class="summary-table">
                <tr>
                    <th>지지력 산정 방법</th>
                    <th>극한지지력 (q_ult)</th>
                    <th>허용지지력 (q_all)</th>
                </tr>
                <tr>
                    <td><strong>Terzaghi 전반전단파괴</strong></td>
                    <td>${q_ult_g.toFixed(2)} kN/m²</td>
                    <td style="font-weight:bold; color:#2980b9;">${q_all_g.toFixed(2)} kN/m²</td>
                </tr>
                <tr>
                    <td><strong>Terzaghi 국부전단파괴</strong></td>
                    <td>${q_ult_l.toFixed(2)} kN/m²</td>
                    <td style="font-weight:bold; color:#2980b9;">${q_all_l.toFixed(2)} kN/m²</td>
                </tr>
                <tr>
                    <td><strong>Terzaghi 수정 지지력공식</strong></td>
                    <td>${q_ult_m.toFixed(2)} kN/m²</td>
                    <td style="font-weight:bold; color:#2980b9;">${q_all_m.toFixed(2)} kN/m²</td>
                </tr>
            </table>
        </div>

        <div class="section-title">[공통 지반 및 기초 검증 데이터]</div>
        - 상부층 보간 적용치 (&gamma;<sub>1</sub>): <strong>${gamma1_eff.toFixed(2)} kN/m³</strong> (${log1})<br>
        - 지지층 보간 적용치 (&gamma;<sub>2</sub>): <strong>${gamma2_eff.toFixed(2)} kN/m³</strong> (${log2})<br>
        - 유효 상재하중 (q = D<sub>f</sub> &times; &gamma;<sub>1</sub>): <strong>${q.toFixed(2)} kN/m²</strong><br><br>

        <div class="section-title">[검증 1] Terzaghi 기초형상계수 표</div>
        <div class="table-container">
            <table class="result-table">
                <tr>
                    <th>형상계수</th>
                    <th>연속기초</th>
                    <th>원형기초</th>
                    <th>정사각형</th>
                    <th>직사각형</th>
                    <th>적용값</th>
                </tr>
                <tr>
                    <td><strong>&alpha;</strong></td>
                    <td>1.0</td>
                    <td>1.3</td>
                    <td>1.3</td>
                    <td>1 + 0.3B/L</td>
                    <td style="background:#e8f8f5; font-weight:bold;">${alpha.toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>&beta;</strong></td>
                    <td>0.5</td>
                    <td>0.3</td>
                    <td>0.4</td>
                    <td>0.5 - 0.1B/L</td>
                    <td style="background:#e8f8f5; font-weight:bold;">${beta.toFixed(2)}</td>
                </tr>
            </table>
        </div>

        <div class="section-title">[검증 2] Terzaghi 전반전단파괴 상세 및 지지력계수 표 (적용 &Phi; = ${phi_in.toFixed(2)}°)</div>
        <div class="table-container">
            <table class="result-table" style="font-size: 0.75em;">
                <tr>
                    <th>계수</th>
                    <th>0°</th><th>5°</th><th>10°</th><th>15°</th><th>20°</th><th>25°</th><th>30°</th><th>35°</th><th>40°</th><th>45°</th>
                    <th style="background:#e8f8f5;">적용값</th>
                </tr>
                <tr>
                    <td><strong>N<sub>c</sub></strong></td>
                    <td>5.7</td><td>7.3</td><td>9.6</td><td>12.9</td><td>17.7</td><td>25.1</td><td>37.2</td><td>57.8</td><td>95.7</td><td>172.3</td>
                    <td style="background:#e8f8f5; font-weight:bold; color:#2980b9;">${f_gen.Nc.toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>N<sub>q</sub></strong></td>
                    <td>1.0</td><td>1.6</td><td>2.7</td><td>4.5</td><td>7.4</td><td>12.7</td><td>22.5</td><td>41.4</td><td>81.3</td><td>173.3</td>
                    <td style="background:#e8f8f5; font-weight:bold; color:#2980b9;">${f_gen.Nq.toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>N<sub>&gamma;</sub></strong></td>
                    <td>0.0</td><td>0.5</td><td>1.2</td><td>2.5</td><td>4.0</td><td>9.7</td><td>19.7</td><td>42.5</td><td>100.4</td><td>297.5</td>
                    <td style="background:#e8f8f5; font-weight:bold; color:#2980b9;">${f_gen.Ng.toFixed(2)}</td>
                </tr>
            </table>
        </div>
        - 항별 세부내역:
        <div class="calc-step">
            • 점착력 항 (&alpha; &times; c &times; N<sub>c</sub>): ${alpha.toFixed(2)} &times; ${c_in.toFixed(2)} &times; ${f_gen.Nc.toFixed(2)} = <strong>${term1_g.toFixed(2)} kN/m²</strong><br>
            • 상재하중 항 (q &times; N<sub>q</sub>): ${q.toFixed(2)} &times; ${f_gen.Nq.toFixed(2)} = <strong>${term2_g.toFixed(2)} kN/m²</strong><br>
            • 기초폭 항 (&beta; &times; &gamma;<sub>2</sub> &times; B &times; N<sub>&gamma;</sub>): ${beta.toFixed(2)} &times; ${gamma2_eff.toFixed(2)} &times; ${B.toFixed(2)} &times; ${f_gen.Ng.toFixed(2)} = <strong>${term3_g.toFixed(2)} kN/m²</strong>
        </div>
        - 극한지지력 (q<sub>ult</sub>): ${term1_g.toFixed(2)} + ${term2_g.toFixed(2)} + ${term3_g.toFixed(2)} = <strong>${q_ult_g.toFixed(2)} kN/m²</strong> (허용: <strong>${q_all_g.toFixed(2)} kN/m²</strong>)<br><br>

        <div class="section-title">[검증 3] Terzaghi 국부전단파괴 상세 및 지지력계수 표 (적용 &Phi; = ${phi_in.toFixed(2)}°)</div>
        - 보정 강도 정수: c' = (2/3) &times; ${c_in.toFixed(2)} = <strong>${c_local.toFixed(2)} kN/m²</strong>, 참조 &Phi;' = atan((2/3)&times;tan(${phi_in.toFixed(2)}°)) = <strong>${phi_local.toFixed(2)}°</strong>
        <div class="table-container" style="margin-top:8px;">
            <table class="result-table" style="font-size: 0.75em;">
                <tr>
                    <th>계수</th>
                    <th>0°</th><th>5°</th><th>10°</th><th>15°</th><th>20°</th><th>25°</th><th>30°</th><th>35°</th><th>40°</th><th>45°</th>
                    <th style="background:#e8f8f5;">적용값</th>
                </tr>
                <tr>
                    <td><strong>N<sub>c</sub></strong></td>
                    <td>5.7</td><td>6.7</td><td>8.0</td><td>9.7</td><td>11.8</td><td>14.8</td><td>19.0</td><td>25.2</td><td>34.9</td><td>51.2</td>
                    <td style="background:#e8f8f5; font-weight:bold; color:#2980b9;">${f_loc.Nc.toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>N<sub>q</sub></strong></td>
                    <td>1.0</td><td>1.4</td><td>1.9</td><td>2.7</td><td>3.9</td><td>5.6</td><td>8.3</td><td>12.6</td><td>20.5</td><td>35.1</td>
                    <td style="background:#e8f8f5; font-weight:bold; color:#2980b9;">${f_loc.Nq.toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>N<sub>&gamma;</sub></strong></td>
                    <td>0.0</td><td>0.2</td><td>0.5</td><td>0.9</td><td>1.7</td><td>3.2</td><td>5.7</td><td>10.1</td><td>18.8</td><td>37.7</td>
                    <td style="background:#e8f8f5; font-weight:bold; color:#2980b9;">${f_loc.Ng.toFixed(2)}</td>
                </tr>
            </table>
        </div>
        - 항별 세부내역:
        <div class="calc-step">
            • 점착력 항 (&alpha; &times; c' &times; N<sub>c</sub>): ${alpha.toFixed(2)} &times; ${c_local.toFixed(2)} &times; ${f_loc.Nc.toFixed(2)} = <strong>${term1_l.toFixed(2)} kN/m²</strong><br>
            • 상재하중 항 (q &times; N<sub>q</sub>): ${q.toFixed(2)} &times; ${f_loc.Nq.toFixed(2)} = <strong>${term2_l.toFixed(2)} kN/m²</strong><br>
            • 기초폭 항 (&beta; &times; &gamma;<sub>2</sub> &times; B &times; N<sub>&gamma;</sub>): ${beta.toFixed(2)} &times; ${gamma2_eff.toFixed(2)} &times; ${B.toFixed(2)} &times; ${f_loc.Ng.toFixed(2)} = <strong>${term3_l.toFixed(2)} kN/m²</strong>
        </div>
        - 극한지지력 (q<sub>ult</sub>): ${term1_l.toFixed(2)} + ${term2_l.toFixed(2)} + ${term3_l.toFixed(2)} = <strong>${q_ult_l.toFixed(2)} kN/m²</strong> (허용: <strong>${q_all_l.toFixed(2)} kN/m²</strong>)<br><br>

        <div class="section-title">[검증 4] Terzaghi 수정 지지력공식 상세 및 지지력계수 표 (적용 &Phi; = ${phi_in.toFixed(2)}°)</div>
        - 보정 강도 정수: c' = (2/3) &times; ${c_in.toFixed(2)} = <strong>${c_local.toFixed(2)} kN/m²</strong>, 참조 &Phi;' = atan((2/3)&times;tan(${phi_in.toFixed(2)}°)) = <strong>${phi_local.toFixed(2)}°</strong>
        <div class="table-container" style="margin-top:8px;">
            <table class="result-table" style="font-size: 0.75em;">
                <tr>
                    <th>계수</th>
                    <th>0°</th><th>5°</th><th>10°</th><th>15°</th><th>20°</th><th>25°</th><th>28°</th><th>32°</th><th>36°</th><th>40° 이상</th>
                    <th style="background:#e8f8f5;">적용값</th>
                </tr>
                <tr>
                    <td><strong>N<sub>c</sub>''</strong></td>
                    <td>5.3</td><td>5.3</td><td>5.3</td><td>6.5</td><td>7.9</td><td>9.9</td><td>11.4</td><td>20.9</td><td>42.2</td><td>95.7</td>
                    <td style="background:#e8f8f5; font-weight:bold; color:#2980b9;">${f_mod.Nc.toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>N<sub>q</sub>''</strong></td>
                    <td>1.0</td><td>1.4</td><td>1.9</td><td>2.7</td><td>3.9</td><td>5.6</td><td>7.1</td><td>14.1</td><td>31.6</td><td>81.2</td>
                    <td style="background:#e8f8f5; font-weight:bold; color:#2980b9;">${f_mod.Nq.toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>N<sub>&gamma;</sub>''</strong></td>
                    <td>0.0</td><td>0.0</td><td>0.0</td><td>1.2</td><td>2.0</td><td>3.3</td><td>4.4</td><td>10.6</td><td>30.5</td><td>114.0</td>
                    <td style="background:#e8f8f5; font-weight:bold; color:#2980b9;">${f_mod.Ng.toFixed(2)}</td>
                </tr>
            </table>
        </div>
        - 항별 세부내역:
        <div class="calc-step">
            • 점착력 항 (&alpha; &times; c' &times; N<sub>c</sub>''): ${alpha.toFixed(2)} &times; ${c_local.toFixed(2)} &times; ${f_mod.Nc.toFixed(2)} = <strong>${term1_m.toFixed(2)} kN/m²</strong><br>
            • 상재하중 항 (q &times; N<sub>q</sub>''): ${q.toFixed(2)} &times; ${f_mod.Nq.toFixed(2)} = <strong>${term2_m.toFixed(2)} kN/m²</strong><br>
            • 기초폭 항 (&beta; &times; &gamma;<sub>2</sub> &times; B &times; N<sub>&gamma;</sub>''): ${beta.toFixed(2)} &times; ${gamma2_eff.toFixed(2)} &times; ${B.toFixed(2)} &times; ${f_mod.Ng.toFixed(2)} = <strong>${term3_m.toFixed(2)} kN/m²</strong>
        </div>
        - 극한지지력 (q<sub>ult</sub>): ${term1_m.toFixed(2)} + ${term2_m.toFixed(2)} + ${term3_m.toFixed(2)} = <strong>${q_ult_m.toFixed(2)} kN/m²</strong> (허용: <strong>${q_all_m.toFixed(2)} kN/m²</strong>)
    `;
}