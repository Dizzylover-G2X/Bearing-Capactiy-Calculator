export function initSettlementModule(container) {
    const getVal = (id, defaultVal) => localStorage.getItem('geo_' + id) ?? defaultVal;

    let schLayers = JSON.parse(localStorage.getItem('geo_sch_layers'));
    if (!schLayers || !Array.isArray(schLayers) || schLayers.length === 0) {
        schLayers = [
            { dz: 1.50, e_val: 10000 },
            { dz: 2.50, e_val: 10000 },
            { dz: 3.00, e_val: 10000 }
        ];
        localStorage.setItem('geo_sch_layers', JSON.stringify(schLayers));
    }

    container.innerHTML = `
        <h3>1. 설계자료 입력 (침하량 검토)</h3>
        
        <!-- 공통 및 지반 설계자료 -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 공통 및 지반 설계자료</div>
        <div class="input-grid" style="margin-bottom: 15px;">
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
            <div class="input-group">
                <label>설계 반력 q_b (kN/m²)</label>
                <input type="number" id="set_qb" value="${getVal('qb', '60.05')}" step="0.01">
            </div>
            <div class="input-group" style="background-color: #fcf3cf; border-color: #f1c40f;">
                <label style="color: #d4ac0d;">허용 기준 침하량 (mm)</label>
                <input type="number" id="set_allow_settlement" value="${getVal('allow_settlement', '25.00')}" step="0.1">
            </div>
        </div>

        <!-- 탄성침하 전용 옵션 -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #2980b9; font-size: 0.95em;">■ 탄성&#8203;침하 산정 전용 옵션</div>
        <div class="input-grid" style="background-color: #ebf5fb; padding: 12px; border-radius: 6px; border: 1px solid #aed6f1; margin-bottom: 15px;">
            <div class="input-group" style="background-color: #fff;">
                <label style="color: #2980b9;">평균 변형계수 E (kN/m²)</label>
                <input type="number" id="set_E" value="${getVal('E', '31401.00')}" step="100">
            </div>
            <div class="input-group" style="background-color: #fff;">
                <label style="color: #2980b9;">평균 포아송비 ν</label>
                <input type="number" id="set_u" value="${getVal('u', '0.345')}" step="0.001">
            </div>
            <div class="input-group" style="background-color: #fff;">
                <label>기초 강성 구분</label>
                <select id="set_rigidity">
                    <option value="rigid" ${getVal('rigidity', 'rigid') === 'rigid' ? 'selected' : ''}>강성기초</option>
                    <option value="flexible" ${getVal('rigidity', 'rigid') === 'flexible' ? 'selected' : ''}>연성기초</option>
                </select>
            </div>
            <div class="input-group" style="background-color: #fff;">
                <label>기초 형상 구분</label>
                <select id="set_shape">
                    <option value="rectangular" ${getVal('shape', 'rectangular') === 'rectangular' ? 'selected' : ''}>구형 / 정방형</option>
                    <option value="circular" ${getVal('shape', 'rectangular') === 'circular' ? 'selected' : ''}>원형기초</option>
                </select>
            </div>
        </div>

        <!-- Schmertmann 전용 옵션 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-weight: bold; color: #8e44ad; font-size: 0.95em;">■ Schmert&#8203;mann 제안식 전용 옵션</div>
            <div style="font-size: 0.85em; color: #8e44ad; font-weight: bold; background: #f4ecf7; padding: 4px 10px; border-radius: 4px; border: 1px solid #d7bde2; display: flex; align-items: center; gap: 8px;">
                <label for="set_t_years">경과년수 t (년):</label>
                <input type="number" id="set_t_years" value="${getVal('t_years', '20.0')}" step="0.1" style="width: 60px; padding: 2px 4px; border: 1px solid #c39bd3; border-radius: 3px; text-align: center; font-weight: bold;">
            </div>
        </div>
        
        <div style="background-color: #f5eef8; padding: 12px; border-radius: 6px; border: 1px solid #d7bde2; margin-bottom: 10px;">
            <div style="font-size: 0.85em; color: #555; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>※ 기초 저면 하부 지층 정보 입력 (최대 심도 Z<sub>f0</sub>까지만 자동 적분됨)</span>
                <button type="button" id="sch_layer_add" style="padding: 4px 10px; background: #8e44ad; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 0.9em; font-weight: bold;">+ 지층 추가</button>
            </div>
            <div class="table-container" style="margin: 0;">
                <table class="result-table" style="font-size: 0.85em; text-align: center; margin: 0; table-layout: fixed; width: 100%;">
                    <thead>
                        <tr style="background-color: #e8daef;">
                            <th style="padding: 6px; width: 25%;">지층명</th>
                            <th style="padding: 6px; width: 30%;">두께 &Delta;z (m)</th>
                            <th style="padding: 6px; width: 35%;">변형계수 E (kN/m²)</th>
                            <th style="padding: 6px; width: 10%;">삭제</th>
                        </tr>
                    </thead>
                    <tbody id="sch_layers_body">
                        <!-- 동적 생성 렌더링 -->
                    </tbody>
                </table>
            </div>
        </div>
        
        <p style="font-size: 0.85em; color: #555; margin-top: 8px;">※ 지지력 탭의 공통 설계자료(B, L, Df, WL, 단위중량)와 실시간 연동됩니다. 물의 단위중량 = 9.807 kN/m³ 적용.</p>
        <button class="action-btn" id="calc-settlement-btn" style="margin-top: 15px;">침하량 산정 및 검토하기</button>
        <div id="settlement-result" class="result-box"></div>
    `;

    function renderSchLayers() {
        const tbody = document.getElementById('sch_layers_body');
        if(!tbody) return;
        tbody.innerHTML = '';
        schLayers.forEach((layer, idx) => {
            tbody.innerHTML += `
                <tr>
                    <td style="padding: 4px; font-weight: bold; color: #2c3e50; background: #fdfefe;">지층${idx + 1}</td>
                    <td style="padding: 4px;"><input type="number" value="${layer.dz.toFixed(2)}" data-idx="${idx}" class="sch-layer-dz" step="0.01" style="width:100%; box-sizing:border-box; padding:4px; border: 1px solid #ccc; border-radius: 2px; text-align: center;"></td>
                    <td style="padding: 4px;"><input type="number" value="${layer.e_val}" data-idx="${idx}" class="sch-layer-e" step="100" style="width:100%; box-sizing:border-box; padding:4px; border: 1px solid #ccc; border-radius: 2px; text-align: center;"></td>
                    <td style="padding: 4px; text-align:center;"><button type="button" class="sch-layer-del" data-idx="${idx}" style="padding:4px 8px; background:#e74c3c; color:white; border:none; border-radius:3px; cursor:pointer;">-</button></td>
                </tr>
            `;
        });
    }
    renderSchLayers();

    const inputs = container.querySelectorAll('.input-grid input, .input-grid select, #set_t_years');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            let key = this.id.replace('set_', '');
            localStorage.setItem('geo_' + key, this.value);
        });
        if (input.tagName === 'INPUT') {
            input.addEventListener('blur', function() {
                let val = parseFloat(this.value);
                if (!isNaN(val)) {
                    this.value = (this.id === 'set_t_years') ? val.toFixed(1) : val.toFixed(2);
                    let key = this.id.replace('set_', '');
                    localStorage.setItem('geo_' + key, this.value);
                }
            });
        }
    });

    container.addEventListener('change', (e) => {
        if (e.target.classList.contains('sch-layer-dz')) {
            schLayers[e.target.dataset.idx].dz = parseFloat(e.target.value) || 0;
            localStorage.setItem('geo_sch_layers', JSON.stringify(schLayers));
        }
        if (e.target.classList.contains('sch-layer-e')) {
            schLayers[e.target.dataset.idx].e_val = parseFloat(e.target.value) || 0;
            localStorage.setItem('geo_sch_layers', JSON.stringify(schLayers));
        }
    });

    container.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('sch-layer-dz')) {
            let val = parseFloat(e.target.value) || 0;
            e.target.value = val.toFixed(2);
        }
    });

    container.addEventListener('click', (e) => {
        if (e.target.id === 'sch_layer_add') {
            schLayers.push({ dz: 1.00, e_val: 10000 });
            localStorage.setItem('geo_sch_layers', JSON.stringify(schLayers));
            renderSchLayers();
        }
        if (e.target.classList.contains('sch-layer-del')) {
            const idx = e.target.dataset.idx;
            schLayers.splice(idx, 1);
            localStorage.setItem('geo_sch_layers', JSON.stringify(schLayers));
            renderSchLayers();
        }
    });

    container.querySelector('#calc-settlement-btn').addEventListener('click', calculateSettlement);
}

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
    const t_years = parseFloat(document.getElementById('set_t_years').value);

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

    // ---------------------------------------------------------
    // [검증 1] 탄성이론에 의한 침하량 산정
    // ---------------------------------------------------------
    const L_over_B = L / B;
    const u_sq = Math.pow(u, 2);
    const factor_base = qb * B * ((1.0 - u_sq) / E) * 1000;

    const Is_rigid = getInfluenceFactor(shape, 'rigid', 'rigid', L_over_B);
    const Is_center = getInfluenceFactor(shape, 'flexible', 'center', L_over_B);
    const Is_midside = getInfluenceFactor(shape, 'flexible', 'midside', L_over_B);
    const Is_corner = getInfluenceFactor(shape, 'flexible', 'corner', L_over_B);
    const Is_average = getInfluenceFactor(shape, 'flexible', 'average', L_over_B);

    const Se_rigid_mm = factor_base * Is_rigid;
    const Se_center_mm = factor_base * Is_center;
    const Se_midside_mm = factor_base * Is_midside;
    const Se_corner_mm = factor_base * Is_corner;
    const Se_average_mm = factor_base * Is_average;

    const pass_se_rigid = Se_rigid_mm <= allow_settle ? "O.K" : "N.G";
    const pass_se_center = Se_center_mm <= allow_settle ? "O.K" : "N.G";
    const pass_se_corner = Se_corner_mm <= allow_settle ? "O.K" : "N.G";
    const shapeLabel = shape === 'circular' ? '원형기초' : '구형/정방형기초';

    // ---------------------------------------------------------
    // [검증 2] Schmertmann 제안식 산정
    // ---------------------------------------------------------
    const sch_ratio = Math.max(1.0, Math.min(10.0, Math.max(L/B, B/L)));
    
    // 심도 및 기초 영향계수 산정식[cite: 1]
    const zf0_ratio = 2.0 + 0.222 * (sch_ratio - 1.0);
    const zf0 = B * zf0_ratio;
    
    const zfp_ratio = 0.5 + 0.0555 * (sch_ratio - 1.0);
    const zfp = B * zfp_ratio;
    const Iz0 = 0.1 + 0.0111 * (sch_ratio - 1.0);

    // zfp 위치 유효응력(sigma_vp_prime) 산정
    let sigma_vp_prime = sigma_v0;
    const water_depth_below_df = Math.max(0, WL - Df);
    if (zfp <= water_depth_below_df) {
        sigma_vp_prime += zfp * gamma2_in;
    } else {
        sigma_vp_prime += water_depth_below_df * gamma2_in;
        sigma_vp_prime += (zfp - water_depth_below_df) * (gamma2_in - gamma_w);
    }

    const Izp = 0.5 + 0.1 * Math.sqrt(Math.max(0, qb - sigma_v0) / sigma_vp_prime);

    let C1 = 1.0 - 0.5 * (sigma_v0 / (qb - sigma_v0));
    if (C1 < 0.5) C1 = 0.5;
    const C2 = 1.0 + 0.2 * Math.log10(t_years / 0.1);

    // ---------------------------------------------------------
    // Breakpoint 기반 자연스러운 지층 분할 알고리즘 적용
    // ---------------------------------------------------------
    let schLayers = JSON.parse(localStorage.getItem('geo_sch_layers')) || [];
    let orig_boundaries = [0];
    let cum_z = 0;
    schLayers.forEach(l => {
        cum_z += l.dz;
        orig_boundaries.push(cum_z);
    });

    // 주요 브레이크포인트 심도 수집 (0, Zfp, Zf0 및 원본 지층 경계들)
    let points = [0, zfp, zf0];
    orig_boundaries.forEach(z => {
        if (z <= zf0) points.push(z);
    });

    // 중복 제거 및 오름차순 정렬 (최대 심도 Zf0 이하로 제한)
    points = Array.from(new Set(points)).filter(z => z >= 0 && z <= zf0).sort((a, b) => a - b);

    let sub_layers = [];
    for (let i = 0; i < points.length - 1; i++) {
        let z_start = points[i];
        let z_end = points[i+1];
        let dz = z_end - z_start;
        if (dz <= 0.0001) continue;

        let z_mid = (z_start + z_end) / 2.0;

        // 해당 구간이 속한 원본 지층 탐색
        let target_layer = schLayers[0];
        let layer_idx = 1;
        let check_z = 0;
        for (let j = 0; j < schLayers.length; j++) {
            check_z += schLayers[j].dz;
            if (z_mid <= check_z + 1e-5) {
                target_layer = schLayers[j];
                layer_idx = j + 1;
                break;
            }
            if (j === schLayers.length - 1) {
                target_layer = schLayers[j];
                layer_idx = j + 1;
            }
        }

        let is_peak_zone = (Math.abs(z_start - zfp) < 1e-4 || Math.abs(z_end - zfp) < 1e-4 || (z_start < zfp && z_end > zfp));
        let name = `지층${layer_idx}`;
        if (is_peak_zone) {
            name += " (Peak 구간)";
        }

        sub_layers.push({
            name: name,
            dz: dz,
            e_val: target_layer.e_val,
            z_start: z_start,
            z_end: z_end,
            z_mid: z_mid,
            is_clipped: (Math.abs(z_end - zf0) < 1e-4 && z_end < orig_boundaries[orig_boundaries.length-1])
        });
    }

    let sum_iz_e_dz = 0;
    let layer_results = [];

    for (let sl of sub_layers) {
        let Iz_mid = 0;
        if (sl.z_mid <= zfp) {
            Iz_mid = Iz0 + (Izp - Iz0) * (sl.z_mid / zfp);
        } else {
            Iz_mid = Izp * (1.0 - (sl.z_mid - zfp) / (zf0 - zfp));
        }

        let val = (Iz_mid / sl.e_val) * sl.dz;
        sum_iz_e_dz += val;

        layer_results.push({
            name: sl.name,
            dz: sl.dz,
            z_mid: sl.z_mid,
            e_val: sl.e_val,
            iz: Iz_mid,
            val: val,
            is_peak: sl.name.includes("Peak"),
            is_clipped: sl.is_clipped
        });
    }

    const Si_mm = C1 * C2 * (qb - sigma_v0) * sum_iz_e_dz * 1000;
    const pass_si = Si_mm <= allow_settle ? "O.K" : "N.G";

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
                ${elasticSummaryRows}
                <tr>
                    <td><strong>Schmert&#8203;mann 제안식 (변형영향계수법)</strong></td>
                    <td style="font-weight:bold; color:#8e44ad;">${Si_mm.toFixed(2)} mm</td>
                    <td>${allow_settle.toFixed(2)} mm</td>
                    <td style="font-weight:bold; color:${pass_si === 'O.K' ? '#27ae60' : '#c0392b'};">${pass_si}</td>
                </tr>
            </table>
        </div>

        <!-- 검증 1: 탄성이론 -->
        <div class="section-title">[검증 1] 탄성&#8203;이론에 의한 침하량 산정 (구조물&#8203;기초설계기준 해설. 2018. P235)</div>
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
        <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 15px; align-items: stretch; margin-top: 8px; margin-bottom: 25px;">
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

        <!-- 검증 2: Schmertmann 제안식 -->
        <div class="section-title">[검증 2] Schmert&#8203;mann 제안식 상세 산정 과정 (구조물&#8203;기초설계기준. 2018. P241)</div>
        
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
            ▶ Schmert&#8203;mann 침하량 기본 산정식<br><br>
            &nbsp;&nbsp;&nbsp;&nbsp;<strong>S<sub>i</sub> = C<sub>1</sub> &times; C<sub>2</sub> &times; (q<sub>b</sub> - &sigma;<sub>v0</sub>') &times; &sum; [ (I<sub>zi</sub> / E<sub>i</sub>) &times; &Delta;z<sub>i</sub> ]</strong><br>
        </div>

        <div class="calc-step">
            <strong>1. 기초 및 지반 조건 산정 (L/B = ${sch_ratio.toFixed(2)} 적용)</strong><br>
            • 최대 영향심도 한계 (Z<sub>f0</sub>) : <strong>${zf0.toFixed(2)} m</strong> [적용식: B &times; (2.0 + 0.222 &times; (${sch_ratio.toFixed(2)} - 1)) = ${B.toFixed(2)} &times; ${zf0_ratio.toFixed(3)}]<br>
            • 최대 영향계수 발생심도 (Z<sub>fp</sub>) : <strong>${zfp.toFixed(2)} m</strong> [적용식: B &times; (0.5 + 0.0555 &times; (${sch_ratio.toFixed(2)} - 1)) = ${B.toFixed(2)} &times; ${zfp_ratio.toFixed(3)}]<br>
            • 기초바닥 영향계수 (I<sub>z0</sub>) : <strong>${Iz0.toFixed(3)}</strong> [적용식: 0.1 + 0.0111 &times; (${sch_ratio.toFixed(2)} - 1)]<br>
            • Z<sub>fp</sub> 위치의 유효응력 (&sigma;<sub>vp</sub>') : <strong>${sigma_vp_prime.toFixed(2)} kN/m²</strong><br>
            • <strong>최대 영향계수 (I<sub>zp</sub>)</strong> : <strong>${Izp.toFixed(3)}</strong> [적용식: 0.5 + 0.1 &times; &radic;( (${qb.toFixed(2)} - ${sigma_v0.toFixed(2)}) / ${sigma_vp_prime.toFixed(2)} )]<br><br>
            
            <strong>2. 보정계수 산정</strong><br>
            • 근입깊이 보정계수 C<sub>1</sub> : <strong>${C1.toFixed(3)}</strong> [적용식: max(0.5, 1 - 0.5 &times; (${sigma_v0.toFixed(2)} / (${qb.toFixed(2)} - ${sigma_v0.toFixed(2)})))]<br>
            • Creep 보정계수 C<sub>2</sub> : <strong>${C2.toFixed(3)}</strong> [적용식: 1 + 0.2 &times; log<sub>10</sub>(${t_years} / 0.1)]<br><br>

            <strong>3. 최종 침하량 산정</strong><br>
            • 지층별 변형영향계수 적분 합계 (&sum; (I<sub>z</sub> / E) &Delta;z) : <strong>${sum_iz_e_dz.toExponential(4)} m²/kN</strong><br>
            • <strong>발생 침하량 S<sub>i</sub> : ${C1.toFixed(3)} &times; ${C2.toFixed(3)} &times; (${qb.toFixed(2)} - ${sigma_v0.toFixed(2)}) &times; ${sum_iz_e_dz.toExponential(4)} &times; 1000 = <span style="color:#8e44ad;">${Si_mm.toFixed(2)} mm</span></strong>
        </div>

        <div class="section-title">■ Schmert&#8203;mann 지층별 영향계수 적분 상세 표 (최대 영향심도 Z<sub>f0</sub> = ${zf0.toFixed(2)} m)</div>
        
        <p style="font-size: 0.8em; color: #2980b9; margin-bottom: 5px;">※ Peak 지점 적분 정밀도를 높이기 위해, <strong>I<sub>zp</sub> 발생심도(Z<sub>fp</sub> = ${zfp.toFixed(2)}m)</strong> 지점을 기준으로 지층이 자동으로 구간 분할되어 계산됩니다.</p>
        
        <div class="table-container">
            <table class="result-table" style="font-size: 0.78em; text-align: center;">
                <thead>
                    <tr style="background-color: #f5eef8;">
                        <th>분석 지층 구간명</th>
                        <th>두께 &Delta;z (m)</th>
                        <th>중앙심도 Z_mid (m)</th>
                        <th>변형계수 E (kN/m²)</th>
                        <th>중앙 영향계수 I<sub>z</sub></th>
                        <th>(I<sub>z</sub> / E) &times; &Delta;z</th>
                        <th>비고</th>
                    </tr>
                </thead>
                <tbody>
                ${layer_results.map(l => `
                    <tr style="${l.is_clipped ? 'background-color: #fdf2e9;' : (l.is_peak ? 'background-color: #eaf2f8; font-weight:bold;' : '')}">
                        <td style="${l.is_peak ? 'color: #2980b9;' : ''}">${l.name}</td>
                        <td style="${l.is_clipped ? 'font-weight:bold; color:#e67e22;' : ''}">${l.dz.toFixed(2)}</td>
                        <td>${l.z_mid.toFixed(2)}</td>
                        <td>${l.e_val.toLocaleString()}</td>
                        <td>${l.iz.toFixed(3)}</td>
                        <td>${l.val.toExponential(4)}</td>
                        <td style="font-size: 0.8em; color: #7f8c8d; text-align:left;">
                            ${l.is_clipped ? '한계심도 초과분 강제 절삭' : (l.is_peak ? 'Peak(Z_fp) 경계 지점 자동분할 구간' : '-')}
                        </td>
                    </tr>
                `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background-color: #eaeded; font-weight: bold;">
                        <td colspan="5">적분 합계 (&sum;)</td>
                        <td colspan="2" style="color: #8e44ad; text-align:left;">&nbsp;&nbsp;${sum_iz_e_dz.toExponential(4)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}
