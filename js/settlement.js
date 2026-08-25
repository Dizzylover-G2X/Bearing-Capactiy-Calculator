export function initSettlementModule(container) {
    // localStorage에서 기존 입력값 불러오기 (없으면 기본값 적용)
    const getVal = (id, defaultVal) => localStorage.getItem('geo_' + id) ?? defaultVal;

    container.innerHTML = `
        <h3>1. 설계자료 입력 (침하량 검토)</h3>
        <div class="input-grid">
            <div class="input-group">
                <label>기초 폭 B (m)</label>
                <input type="number" id="set_B" value="${getVal('B', '1.82')}" step="0.01">
            </div>
            <div class="input-group">
                <label>기초 길이 L (m)</label>
                <input type="number" id="set_L" value="${getVal('L', '2.00')}" step="0.01">
            </div>
            <div class="input-group">
                <label>근입 깊이 Df (m)</label>
                <input type="number" id="set_Df" value="${getVal('Df', '2.20')}" step="0.01">
            </div>
            <div class="input-group">
                <label>지하수위 WL (GL.-m)</label>
                <input type="number" id="set_WL" value="${getVal('WL', '3.38')}" step="0.01">
            </div>
            <div class="input-group">
                <label>상부층 단위중량 γ1 (kN/m³)</label>
                <input type="number" id="set_gamma1" value="${getVal('gamma1', '18.00')}" step="0.01">
            </div>
            <div class="input-group">
                <label>지지층 단위중량 γ2 (kN/m³)</label>
                <input type="number" id="set_gamma2" value="${getVal('gamma2', '18.00')}" step="0.01">
            </div>
            <div class="input-group" style="background-color: #eaf2f8; border-color: #3498db;">
                <label style="color: #2980b9;">평균 변형계수 E (kN/m²)</label>
                <input type="number" id="set_E" value="${getVal('E', '31401.00')}" step="100">
            </div>
            <div class="input-group" style="background-color: #eaf2f8; border-color: #3498db;">
                <label style="color: #2980b9;">평균 포아송비 ν</label>
                <input type="number" id="set_u" value="${getVal('u', '0.345')}" step="0.001">
            </div>
            <div class="input-group" style="background-color: #f4f6f7; border-color: #bdc3c7;">
                <label>기초 강성 구분</label>
                <select id="set_rigidity">
                    <option value="rigid" ${getVal('rigidity', 'rigid') === 'rigid' ? 'selected' : ''}>강성기초</option>
                    <option value="flexible" ${getVal('rigidity', 'rigid') === 'flexible' ? 'selected' : ''}>연성기초</option>
                </select>
            </div>
            <div class="input-group" style="background-color: #f4f6f7; border-color: #bdc3c7;">
                <label>기초 형상 구분</label>
                <select id="set_shape">
                    <option value="rectangular" ${getVal('shape', 'rectangular') === 'rectangular' ? 'selected' : ''}>구형 / 정방형</option>
                    <option value="circular" ${getVal('shape', 'rectangular') === 'circular' ? 'selected' : ''}>원형기초</option>
                </select>
            </div>
            <div class="input-group" style="background-color: #eaf2f8; border-color: #3498db;">
                <label style="color: #2980b9;">설계 반력 q_b (kN/m²)</label>
                <input type="number" id="set_qb" value="${getVal('qb', '60.05')}" step="0.01">
            </div>
            <div class="input-group" style="background-color: #fcf3cf; border-color: #f1c40f;">
                <label style="color: #d4ac0d;">허용 기준 침하량 (mm)</label>
                <input type="number" id="set_allow_settlement" value="${getVal('allow_settlement', '25.00')}" step="0.1">
            </div>
        </div>
        
        <p style="font-size: 0.85em; color: #555; margin-top: 8px;">※ 지지력 탭의 공통 설계자료(B, L, Df, WL, 단위중량)와 실시간 연동됩니다. 물의 단위중량 = 9.807 kN/m³ 적용.</p>
        <button class="action-btn" id="calc-settlement-btn">침하량 산정 및 검토하기</button>
        <div id="settlement-result" class="result-box"></div>
    `;

    // 입력값 변경 시 localStorage 저장
    const inputs = container.querySelectorAll('.input-grid input, .input-grid select');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            let key = this.id.replace('set_', '');
            localStorage.setItem('geo_' + key, this.value);
        });
        if (input.tagName === 'INPUT') {
            input.addEventListener('blur', function() {
                let val = parseFloat(this.value);
                if (!isNaN(val)) {
                    this.value = val.toFixed(2);
                    let key = this.id.replace('set_', '');
                    localStorage.setItem('geo_' + key, this.value);
                }
            });
        }
    });

    container.querySelector('#calc-settlement-btn').addEventListener('click', calculateSettlement);
}

// 영향계수 Is 보간 함수 (표 4.3.2 데이터 기반)
function getInfluenceFactor(shape, rigidity, position, ratio) {
    if (shape === 'circular') {
        if (rigidity === 'rigid') return 0.79;
        switch (position) {
            case 'center': return 1.00;
            case 'midside': return 0.64;
            case 'corner': return 0.64;
            case 'average': return 0.85;
            default: return 0.85;
        }
    }

    const lbTable = [1.0, 2.0, 5.0, 10.0];
    const data = {
        rigid:   [0.88, 1.12, 1.60, 2.00],
        center:  [1.12, 1.53, 2.10, 2.56],
        midside: [0.76, 1.12, 1.68, 2.10],
        corner:  [0.56, 0.76, 1.05, 1.28],
        average: [0.95, 1.30, 1.82, 2.24]
    };

    let key = (rigidity === 'rigid') ? 'rigid' : position;
    let values = data[key] || data['average'];

    let r = Math.max(1.0, Math.min(10.0, ratio));

    if (r <= 1.0) return values[0];
    if (r >= 10.0) return values[3];

    for (let i = 0; i < lbTable.length - 1; i++) {
        if (r >= lbTable[i] && r <= lbTable[i+1]) {
            let x0 = lbTable[i], x1 = lbTable[i+1];
            let y0 = values[i], y1 = values[i+1];
            return y0 + (y1 - y0) * (r - x0) / (x1 - x0);
        }
    }
    return values[0];
}

function calculateSettlement() {
    const B = parseFloat(document.getElementById('set_B').value);
    const L = parseFloat(document.getElementById('set_L').value);
    const Df = parseFloat(document.getElementById('set_Df').value);
    const WL = parseFloat(document.getElementById('set_WL').value);
    const gamma1_in = parseFloat(document.getElementById('set_gamma1').value);
    const gamma2_in = parseFloat(document.getElementById('set_gamma2').value);
    const E = parseFloat(document.getElementById('set_E').value);
    const u = parseFloat(document.getElementById('set_u').value);
    const qb = parseFloat(document.getElementById('set_qb').value);
    const allow_settle = parseFloat(document.getElementById('set_allow_settlement').value);

    const rigidity = document.getElementById('set_rigidity').value;
    const shape = document.getElementById('set_shape').value;

    const gamma_w = 9.807;

    let gamma1_eff = gamma1_in;
    let log1 = "";
    const gamma1_sub = gamma1_in - gamma_w;
    if (WL <= 0) {
        gamma1_eff = gamma1_sub;
        log1 = "전구간 수중단위중량 적용";
    } else if (WL >= Df) {
        gamma1_eff = gamma1_in;
        log1 = "전구간 건조/습윤 단위중량 적용";
    } else {
        gamma1_eff = gamma1_sub + gamma_w * (WL / Df);
        log1 = "지하수위 선형 보간 적용";
    }

    const sigma_v0 = Df * gamma1_eff;

    // 1. Schmertmann 제안식 산정
    let C1 = 1.0 - 0.5 * (sigma_v0 / (qb - sigma_v0));
    if (C1 < 0.5) C1 = 0.5;
    const years = 100;
    const C2 = 1.0 + 0.2 * Math.log10(10 * years);

    const layers = [
        { name: "매립층", dz: 0.30, e_val: 7000, iz: 0.268 },
        { name: "매립층", dz: 0.30, e_val: 7000, iz: 0.435 },
        { name: "매립층", dz: 0.32, e_val: 7000, iz: 0.613 },
        { name: "매립층", dz: 1.26, e_val: 7000, iz: 0.365 },
        { name: "퇴적층(자갈)", dz: 0.60, e_val: 60000, iz: 0.248 },
        { name: "퇴적층(자갈)", dz: 0.60, e_val: 60000, iz: 0.198 },
        { name: "퇴적층(자갈)", dz: 0.66, e_val: 60000, iz: 0.099 }
    ];

    let sum_iz_e_dz = 0;
    layers.forEach(layer => {
        sum_iz_e_dz += (layer.iz / layer.e_val) * layer.dz;
    });

    const Si_m = C1 * C2 * (qb - sigma_v0) * sum_iz_e_dz;
    const Si_mm = Si_m * 1000;

    // 2. 탄성이론에 의한 침하량 (Case별 산정)
    const L_over_B = L / B;
    const u_sq = Math.pow(u, 2);
    const factor_base = qb * B * ((1.0 - u_sq) / E) * 1000;

    // Is 값 산정
    const Is_rigid = getInfluenceFactor(shape, 'rigid', 'rigid', L_over_B);
    const Is_center = getInfluenceFactor(shape, 'flexible', 'center', L_over_B);
    const Is_midside = getInfluenceFactor(shape, 'flexible', 'midside', L_over_B);
    const Is_corner = getInfluenceFactor(shape, 'flexible', 'corner', L_over_B);
    const Is_average = getInfluenceFactor(shape, 'flexible', 'average', L_over_B);

    // 침하량 산정 (mm)
    const Se_rigid_mm = factor_base * Is_rigid;
    const Se_center_mm = factor_base * Is_center;
    const Se_midside_mm = factor_base * Is_midside;
    const Se_corner_mm = factor_base * Is_corner;
    const Se_average_mm = factor_base * Is_average;

    // O.K / N.G 판정
    const pass_si = Si_mm <= allow_settle ? "O.K" : "N.G";
    const pass_se_rigid = Se_rigid_mm <= allow_settle ? "O.K" : "N.G";
    const pass_se_center = Se_center_mm <= allow_settle ? "O.K" : "N.G";
    const pass_se_corner = Se_corner_mm <= allow_settle ? "O.K" : "N.G";

    const shapeLabel = shape === 'circular' ? '원형기초' : '구형/정방형기초';

    // 요약 결과 테이블 탄성이론 행 동적 구성
    let elasticSummaryRows = '';
    if (rigidity === 'rigid') {
        elasticSummaryRows = `
            <tr>
                <td><strong>탄성&#8203;이론 (강성기초)</strong></td>
                <td style="font-weight:bold; color:#e67e22;">${Se_rigid_mm.toFixed(2)} mm</td>
                <td>${allow_settle.toFixed(2)} mm</td>
                <td style="font-weight:bold; color:${pass_se_rigid === 'O.K' ? '#27ae60' : '#c0392b'};">${pass_se_rigid}</td>
            </tr>
        `;
    } else {
        elasticSummaryRows = `
            <tr>
                <td><strong>탄성&#8203;이론 (연성기초 - 중심점 [최대])</strong></td>
                <td style="font-weight:bold; color:#e67e22;">${Se_center_mm.toFixed(2)} mm</td>
                <td>${allow_settle.toFixed(2)} mm</td>
                <td style="font-weight:bold; color:${pass_se_center === 'O.K' ? '#27ae60' : '#c0392b'};">${pass_se_center}</td>
            </tr>
            <tr>
                <td><strong>탄성&#8203;이론 (연성기초 - 모서리점 [최소])</strong></td>
                <td style="font-weight:bold; color:#e67e22;">${Se_corner_mm.toFixed(2)} mm</td>
                <td>${allow_settle.toFixed(2)} mm</td>
                <td style="font-weight:bold; color:${pass_se_corner === 'O.K' ? '#27ae60' : '#c0392b'};">${pass_se_corner}</td>
            </tr>
        `;
    }

    const resultDiv = document.getElementById('settlement-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="section-title">[침하량 검토 요약 결과]</div>
        <div class="table-container">
            <table class="summary-table">
                <tr>
                    <th>침하량 산정 방법</th>
                    <th>발생 침하량</th>
                    <th>허용 기준 침하량</th>
                    <th>판정</th>
                </tr>
                <tr>
                    <td><strong>Schmertmann 제안식 (변형영향계수법)</strong></td>
                    <td style="font-weight:bold; color:#2980b9;">${Si_mm.toFixed(2)} mm</td>
                    <td>${allow_settle.toFixed(2)} mm</td>
                    <td style="font-weight:bold; color:${pass_si === 'O.K' ? '#27ae60' : '#c0392b'};">${pass_si}</td>
                </tr>
                ${elasticSummaryRows}
            </table>
        </div>

        <div class="section-title">[검증 1] Schmertmann 제안식 상세 산정 과정</div>
        <div class="calc-step">
            • 기초 근입깊이 유효상재하중 (&sigma;<sub>v0</sub>* = D<sub>f</sub> &times; &gamma;<sub>1,eff</sub>): ${Df.toFixed(2)} &times; ${gamma1_eff.toFixed(2)} = <strong>${sigma_v0.toFixed(2)} kN/m²</strong> (${log1})<br>
            • 근입깊이 보정계수 (C<sub>1</sub> = 1 - 0.5 &times; [&sigma;<sub>v0</sub>* / (q<sub>b</sub> - &sigma;<sub>v0</sub>*)]): max(0.5, 1 - 0.5 &times; [${sigma_v0.toFixed(2)} / (${qb.toFixed(2)} - ${sigma_v0.toFixed(2)})]) = <strong>${C1.toFixed(2)}</strong><br>
            • Creep 보정계수 (C<sub>2</sub> = 1 + 0.2 &times; log<sub>10</sub>(10 &times; ${years}년)): <strong>${C2.toFixed(2)}</strong><br>
            • 지층별 변형영향계수 적분값 (&sum; (I<sub>z</sub> / E) &Delta;z): <strong>${sum_iz_e_dz.toExponential(3)} m²/kN</strong><br>
            • <strong>최종 탄성침하량 (S<sub>i</sub>): C<sub>1</sub> &times; C<sub>2</sub> &times; (q<sub>b</sub> - &sigma;<sub>v0</sub>*) &times; &sum; (I<sub>z</sub> / E) &Delta;z = ${Si_mm.toFixed(2)} mm</strong>
        </div>

        <div class="section-title">■ Schmertmann 지층별 적분 상세 표</div>
        <div class="table-container">
            <table class="result-table" style="font-size: 0.78em; text-align: center;">
                <tr>
                    <th>지층명</th>
                    <th>두께 &Delta;z (m)</th>
                    <th>변형계수 E (kN/m²)</th>
                    <th>영향계수 I<sub>z</sub></th>
                    <th>(I<sub>z</sub> / E) &times; &Delta;z</th>
                </tr>
                ${layers.map(l => `
                    <tr>
                        <td>${l.name}</td>
                        <td>${l.dz.toFixed(2)}</td>
                        <td>${l.e_val.toLocaleString()}</td>
                        <td>${l.iz.toFixed(3)}</td>
                        <td>${((l.iz / l.e_val) * l.dz).toExponential(5)}</td>
                    </tr>
                `).join('')}
                <tr style="background-color: #eaeded; font-weight: bold;">
                    <td colspan="4">합계 (&sum;)</td>
                    <td>${sum_iz_e_dz.toExponential(4)}</td>
                </tr>
            </table>
        </div><br>

        <div class="section-title">[검증 2] 탄성&#8203;이론에 의한 침하량 산정 (구조물&#8203;기초설계기준 해설. 2018. P235)</div>
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
            ▶ 탄성&#8203;이론 기본 계산식 (Df = 0, 기초하부 침하발생 지반의 두께가 매우 클 경우)<br><br>
            &nbsp;&nbsp;&nbsp;&nbsp;<strong>Se = q &times; B &times; [ (1 - &nu;&sup2;) / E ] &times; Is</strong><br><br>
            &nbsp;&nbsp;&nbsp;&nbsp;= ${qb.toFixed(1)} &times; ${B.toFixed(2)} &times; ( 1.0 &minus; ${(u_sq).toFixed(3)} ) / ${E.toFixed(1)} &times; Is<br>
        </div>

        <div class="calc-step" style="margin-bottom: 12px;">
            ① q : 기초작용 하중 = <strong>${qb.toFixed(1)} kN/m²</strong><br>
            ② B : 기초 폭 = <strong>${B.toFixed(2)} m</strong><br>
            ③ E : 지반의 탄성계수 = <strong>${E.toLocaleString()} kN/m²</strong><br>
            ④ &nu; : 지반의 포아송 비 = <strong>${u.toFixed(3)}</strong><br>
            ⑤ Is : 탄성&#8203;침하의 영향&#8203;계수 (${shapeLabel}, L/B = ${L_over_B.toFixed(2)})
        </div>

        <div class="section-title">■ 강성 및 연성 기초 위치별 침하량 산정 결과 (Case별 비교)</div>
        <div class="table-container" style="margin-bottom: 15px;">
            <table class="result-table" style="font-size: 0.8em; text-align: center;">
                <thead>
                    <tr style="background-color: #ebf5fb;">
                        <th>구분 (Case)</th>
                        <th>영향계수 (Is)</th>
                        <th>산정식 [q &times; B &times; (1-&nu;&sup2;) / E &times; Is]</th>
                        <th>발생 침하량 (mm)</th>
                        <th>적용 상태</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="${rigidity === 'rigid' ? 'background-color: #e8f8f5; font-weight: bold;' : ''}">
                        <td><strong>강성&#8203;기초</strong></td>
                        <td>${Is_rigid.toFixed(2)}</td>
                        <td>${qb.toFixed(1)} &times; ${B.toFixed(2)} &times; (1 - ${u_sq.toFixed(3)}) / ${E.toFixed(1)} &times; ${Is_rigid.toFixed(2)}</td>
                        <td style="color:#e67e22; font-weight:bold;">${Se_rigid_mm.toFixed(2)} mm</td>
                        <td>${rigidity === 'rigid' ? '<span style="color:#27ae60; font-weight:bold;">● 선택됨 (요약표 반영)</span>' : '-'}</td>
                    </tr>
                    <tr style="${rigidity === 'flexible' ? 'background-color: #e8f8f5; font-weight: bold;' : ''}">
                        <td><strong>연성&#8203;기초 (중심점 [최대])</strong></td>
                        <td>${Is_center.toFixed(2)}</td>
                        <td>${qb.toFixed(1)} &times; ${B.toFixed(2)} &times; (1 - ${u_sq.toFixed(3)}) / ${E.toFixed(1)} &times; ${Is_center.toFixed(2)}</td>
                        <td style="color:#e67e22; font-weight:bold;">${Se_center_mm.toFixed(2)} mm</td>
                        <td>${rigidity === 'flexible' ? '<span style="color:#27ae60; font-weight:bold;">● 선택됨 (요약표 반영)</span>' : '-'}</td>
                    </tr>
                    <tr>
                        <td>연성&#8203;기초 (외변&#8203;중점)</td>
                        <td>${Is_midside.toFixed(2)}</td>
                        <td>${qb.toFixed(1)} &times; ${B.toFixed(2)} &times; (1 - ${u_sq.toFixed(3)}) / ${E.toFixed(1)} &times; ${Is_midside.toFixed(2)}</td>
                        <td>${Se_midside_mm.toFixed(2)} mm</td>
                        <td>-</td>
                    </tr>
                    <tr style="${rigidity === 'flexible' ? 'background-color: #e8f8f5; font-weight: bold;' : ''}">
                        <td><strong>연성&#8203;기초 (모서리&#8203;점 [최소])</strong></td>
                        <td>${Is_corner.toFixed(2)}</td>
                        <td>${qb.toFixed(1)} &times; ${B.toFixed(2)} &times; (1 - ${u_sq.toFixed(3)}) / ${E.toFixed(1)} &times; ${Is_corner.toFixed(2)}</td>
                        <td style="color:#e67e22; font-weight:bold;">${Se_corner_mm.toFixed(2)} mm</td>
                        <td>${rigidity === 'flexible' ? '<span style="color:#27ae60; font-weight:bold;">● 선택됨 (요약표 반영)</span>' : '-'}</td>
                    </tr>
                    <tr>
                        <td>연성&#8203;기초 (평균)</td>
                        <td>${Is_average.toFixed(2)}</td>
                        <td>${qb.toFixed(1)} &times; ${B.toFixed(2)} &times; (1 - ${u_sq.toFixed(3)}) / ${E.toFixed(1)} &times; ${Is_average.toFixed(2)}</td>
                        <td>${Se_average_mm.toFixed(2)} mm</td>
                        <td>-</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section-title">■ 탄성&#8203;침하의 영향&#8203;계수 Is (구조물&#8203;기초설계기준 해설 표 4.3.2 및 그림 4.3.7)</div>
        
        <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 15px; align-items: stretch; margin-top: 8px;">
            <div class="table-container" style="margin: 0;">
                <table class="result-table" style="font-size: 0.75em; text-align: center; width: 100%; table-layout: fixed; height: 100%; margin: 0;">
                    <thead>
                        <tr style="background-color: #eaeded;">
                            <th rowspan="2" style="padding:10px 2px; width: 22%; vertical-align: middle; white-space: nowrap;">영향&#8203;계수 Is</th>
                            <th rowspan="2" style="padding:10px 2px; width: 9%; vertical-align: middle; white-space: nowrap;">강성&#8203;기초</th>
                            <th colspan="4" style="padding:6px 2px; width: 45%; vertical-align: middle; white-space: nowrap;">연성&#8203;기초</th>
                            <th rowspan="2" style="padding:10px 2px; width: 24%; vertical-align: middle;">비고</th>
                        </tr>
                        <tr style="background-color: #eaeded;">
                            <th style="padding:6px 1px; vertical-align: middle; font-size: 0.9em; white-space: nowrap;">중심&#8203;점</th>
                            <th style="padding:6px 1px; vertical-align: middle; font-size: 0.9em; white-space: nowrap;">외변&#8203;중점</th>
                            <th style="padding:6px 1px; vertical-align: middle; font-size: 0.9em; white-space: nowrap;">모서리</th>
                            <th style="padding:6px 1px; vertical-align: middle; font-size: 0.9em; white-space: nowrap;">평균</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="${shape === 'circular' ? 'background-color: #e8f8f5; font-weight: bold;' : ''}">
                            <td style="padding: 10px 2px; vertical-align: middle; white-space: nowrap;">원형&#8203;기초</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">0.79</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">1.00</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">0.64</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">-</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">0.85</td>
                            <td rowspan="5" style="text-align:left; padding:4px 6px; font-size:0.75em; word-break: keep-all; vertical-align: middle; line-height: 1.3;">
                                연성&#8203;기초 중심&#8203;점 영향치는 모서리&#8203;점의 2배임. 즉, 중심&#8203;점 침하는 모서리&#8203;점 침하의 2배임.
                            </td>
                        </tr>
                        <tr style="${shape === 'rectangular' && L_over_B === 1 ? 'background-color: #e8f8f5; font-weight: bold;' : ''}">
                            <td style="padding: 10px 2px; vertical-align: middle; white-space: nowrap;">정방형&#8203;기초</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">0.88</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">1.12</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">0.76</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">0.56</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">0.95</td>
                        </tr>
                        <tr style="${shape === 'rectangular' && L_over_B > 1 && L_over_B <= 3.5 ? 'background-color: #e8f8f5; font-weight: bold;' : ''}">
                            <td style="padding: 10px 2px; vertical-align: middle; white-space: nowrap;">구형&#8203;기초 (L/B=2)</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">1.12</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">1.53</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">1.12</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">0.76</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">1.30</td>
                        </tr>
                        <tr style="${shape === 'rectangular' && L_over_B > 3.5 && L_over_B <= 7.5 ? 'background-color: #e8f8f5; font-weight: bold;' : ''}">
                            <td style="padding: 10px 2px; vertical-align: middle; white-space: nowrap;">구형&#8203;기초 (L/B=5)</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">1.60</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">2.10</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">1.68</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">1.05</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">1.82</td>
                        </tr>
                        <tr style="${shape === 'rectangular' && L_over_B > 7.5 ? 'background-color: #e8f8f5; font-weight: bold;' : ''}">
                            <td style="padding: 10px 2px; vertical-align: middle; white-space: nowrap;">구형&#8203;기초 (L/B=10)</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">2.00</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">2.56</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">2.10</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">1.28</td>
                            <td style="padding: 10px 2px; vertical-align: middle;">2.24</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style="background: #fff; border: 1px solid #d5d8dc; border-radius: 4px; display: flex; flex-direction: column; justify-content: center; align-items: center; overflow: hidden; padding: 0;">
                <img src="images/is_graph.png" alt="탄성침하 영향계수 그래프" style="width: 100%; height: 100%; object-fit: contain; border-radius: 2px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="display: none; padding: 20px; font-size: 0.8em; color: #7f8c8d; border: 1px dashed #bdc3c7; width: 100%; text-align: center;">[이미지 경로: images/is_graph.png 필요]</div>
            </div>
        </div>
    `;
}
