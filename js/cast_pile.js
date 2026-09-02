export function initCastPileModule(container) {
    const getVal = (id, defaultVal) => {
        try {
            return localStorage.getItem('geo_cast_pile_' + id) ?? defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

    let pileLayers;
    try {
        pileLayers = JSON.parse(localStorage.getItem('geo_cast_pile_layers'));
    } catch (e) {
        pileLayers = null;
    }

    if (!pileLayers || !Array.isArray(pileLayers) || pileLayers.length === 0) {
        pileLayers = [
            { name: '토사층', type: 'sand', dz: 5.0, n_val: 30, gamma: 19.0, c_val: 0 },
            { name: '풍화암층', type: 'weathered_rock', dz: 5.0, n_val: 50, gamma: 20.0, c_val: 30 },
            { name: '기반암층', type: 'rock', dz: 3.0, n_val: 50, gamma: 22.0, c_val: 12000 }
        ];
        try { localStorage.setItem('geo_cast_pile_layers', JSON.stringify(pileLayers)); } catch (e) {}
    }

    const calcTotalL = () => pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

    const initialType = getVal('type', 'CAST_ROCK');
    const initialGWT = getVal('gwt', '2.0');

    container.innerHTML = `
        <h3>1. 설계자료 입력 (현장타설말뚝 연직지지력 검토)</h3>
        
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 말뚝 제원 및 시공 조건</div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px;">
            <div class="input-group" style="margin:0;">
                <label>말뚝 종류</label>
                <select id="pile_type" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.88em;">
                    <option value="CAST" ${initialType === 'CAST' ? 'selected' : ''}>현장타설말뚝(토사/풍화암)</option>
                    <option value="CAST_ROCK" ${initialType === 'CAST_ROCK' ? 'selected' : ''}>현장타설말뚝(기반암)</option>
                </select>
            </div>
            <div class="input-group" style="margin:0;">
                <label id="grid2_label">세부 구분</label>
                <div id="grid2_content" style="height:32px; display:flex; align-items:center;"></div>
            </div>
            <div class="input-group" style="margin:0;">
                <label>말뚝 직경 D (mm)</label>
                <input type="number" id="pile_D" value="${getVal('D', '1000')}" step="100" style="width:100%; height:32px; text-align:center; box-sizing:border-box; padding:2px; font-size:0.88em;">
            </div>
            <div class="input-group" style="margin:0;">
                <label>콘크리트 강도 f'_c (MPa)</label>
                <input type="number" id="pile_fck" value="${getVal('fck', '27.0')}" step="0.1" style="width:100%; height:32px; text-align:center; box-sizing:border-box; padding:2px; font-size:0.88em;">
            </div>
            <div class="input-group" style="margin:0;">
                <label id="grid5_label" style="font-size: 0.78em; letter-spacing: -0.6px;">허용압축응력 &sigma;<sub>ca</sub> (MPa)</label>
                <input type="number" id="grid5_val" value="${getVal('grid5_val', '35.0')}" step="0.1" style="width:100%; height:32px; box-sizing:border-box; padding:4px; text-align:center; font-weight:bold;">
            </div>
        </div>

        <div id="pile_row2_container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px;"></div>
        <div id="formula_info_box" style="margin-bottom: 15px; font-size: 0.83em; color: #2c3e50; background: #f4f6f7; padding: 8px 12px; border-radius: 4px; border-left: 4px solid #16a085;"></div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400; font-size: 0.95em;">■ 작용 하중 (상부구조 반력)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99;">
            <div class="input-group" style="background:#fff;">
                <label style="color:#d35400;">평상시 P<sub>norm</sub> (kN/본)</label>
                <input type="number" id="pile_P_norm" value="${getVal('P_norm', '3000.0')}" step="0.1">
            </div>
            <div class="input-group" style="background:#fff;">
                <label style="color:#c0392b;">내진시 P<sub>seis</sub> (kN/본)</label>
                <input type="number" id="pile_P_seis" value="${getVal('P_seis', '2500.0')}" step="0.1">
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-weight: bold; color: #27ae60; font-size: 0.95em;">■ 지층 정보</span>
                <div style="display: flex; align-items: center; gap: 5px; font-size: 0.85em; color: #2c3e50; background: #eaf2f8; padding: 2px 8px; border-radius: 4px; border: 1px solid #aeb6bf;">
                    <label for="pile_gwt" style="font-weight: bold;">지하수위 GWT (GL. -m):</label>
                    <input type="number" id="pile_gwt" value="${initialGWT}" step="0.1" style="width: 55px; height: 22px; text-align: center; border: 1px solid #ccc; font-weight: bold;">
                </div>
            </div>
            <button type="button" id="pile_layer_add" style="padding: 4px 10px; background: #27ae60; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85em; font-weight: bold;">+ 지층 추가</button>
        </div>
        
        <div style="background-color: #e8f8f5; padding: 12px; border-radius: 6px; border: 1px solid #a3e4d7; margin-bottom: 15px;">
            <div class="table-container" style="margin: 0;">
                <table class="result-table" style="font-size: 0.85em; text-align: center; margin: 0; width: 100%; table-layout: fixed;">
                    <thead>
                        <tr style="background-color: #d1f2eb;">
                            <th style="width: 19%; padding: 6px;">지층명</th>
                            <th style="width: 22%; padding: 6px;">토성 구분</th>
                            <th style="width: 10%; padding: 6px;">층후 L<br>(m)</th>
                            <th style="width: 10%; padding: 6px;">평균<br>N치</th>
                            <th style="width: 14%; padding: 6px;">단위중량 &gamma;<br>(kN/m³)</th>
                            <th style="width: 19%; padding: 6px;">점착력 c (kPa) /<br>일축압축강도 q<sub>u</sub> (kPa)</th>
                            <th style="width: 6%; padding: 6px;">삭제</th>
                        </tr>
                    </thead>
                    <tbody id="pile_layers_body"></tbody>
                    <tfoot>
                        <tr style="background-color: #ebf5fb; font-weight: bold; border-top: 2px solid #a3e4d7;">
                            <td colspan="2" style="padding: 8px 6px; text-align: right; color: #2980b9;">말뚝 총 길이 L (m) :</td>
                            <td id="pile_L_val" style="padding: 8px 6px; color: #16a085; font-size: 1.05em; text-align: center;">${calcTotalL().toFixed(2)}</td>
                            <td colspan="4" style="padding: 8px 6px; text-align: left; color: #7f8c8d; font-size: 0.85em;">(지층 층후 자동 합산)</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <button type="button" class="action-btn" id="calc-pile-btn" style="margin-top: 10px; cursor: pointer;">현장타설말뚝 연직지지력 산정</button>
        <div id="pile-result" class="result-box" style="display: none;"></div>
    `;

    const HB_TABLE_DATA = [
        { rmr: 3,   m: { 7: 0.007, 10: 0.010, 15: 0.015, 17: 0.017, 25: 0.025 }, s: 1.0e-7 },
        { rmr: 23,  m: { 7: 0.029, 10: 0.041, 15: 0.061, 17: 0.069, 25: 0.102 }, s: 3.0e-6 },
        { rmr: 44,  m: { 7: 0.128, 10: 0.183, 15: 0.275, 17: 0.311, 25: 0.458 }, s: 9.0e-5 },
        { rmr: 65,  m: { 7: 0.575, 10: 0.821, 15: 1.231, 17: 1.395, 25: 2.052 }, s: 0.0029 },
        { rmr: 85,  m: { 7: 2.400, 10: 3.430, 15: 5.140, 17: 5.820, 25: 8.567 }, s: 0.082 },
        { rmr: 100, m: { 7: 7.000, 10: 10.000, 15: 15.000, 17: 17.000, 25: 25.000 }, s: 1.00 }
    ];

    const TABLE_EM_EI = [
        { rqd: 0,   closed: 0.0,  open: 0.0 },
        { rqd: 20,  closed: 0.05, open: 0.05 },
        { rqd: 50,  closed: 0.15, open: 0.10 },
        { rqd: 70,  closed: 0.70, open: 0.10 },
        { rqd: 100, closed: 1.00, open: 0.60 }
    ];

    const TABLE_ALPHA_E = [
        { ratio: 0.000, alpha: 0.000 },
        { ratio: 0.010, alpha: 0.370 },
        { ratio: 0.050, alpha: 0.450 },
        { ratio: 0.100, alpha: 0.550 },
        { ratio: 0.300, alpha: 0.700 },
        { ratio: 0.500, alpha: 0.800 },
        { ratio: 1.000, alpha: 1.000 }
    ];

    function interpolateHoekBrown(rmrVal, miVal) {
        if (rmrVal <= 3) return { m: HB_TABLE_DATA[0].m[miVal], s: HB_TABLE_DATA[0].s };
        if (rmrVal >= 100) return { m: HB_TABLE_DATA[5].m[miVal], s: HB_TABLE_DATA[5].s };
        for (let i = 0; i < HB_TABLE_DATA.length - 1; i++) {
            const row1 = HB_TABLE_DATA[i];
            const row2 = HB_TABLE_DATA[i + 1];
            if (rmrVal >= row1.rmr && rmrVal <= row2.rmr) {
                const t = (rmrVal - row1.rmr) / (row2.rmr - row1.rmr);
                return { m: row1.m[miVal] + t * (row2.m[miVal] - row1.m[miVal]), s: row1.s + t * (row2.s - row1.s) };
            }
        }
        return { m: HB_TABLE_DATA[2].m[miVal], s: HB_TABLE_DATA[2].s };
    }

    function interpolateEmEi(rqdVal, jointState) {
        const key = jointState === 'open' ? 'open' : 'closed';
        if (rqdVal <= 0) return TABLE_EM_EI[0][key];
        if (rqdVal >= 100) return TABLE_EM_EI[TABLE_EM_EI.length - 1][key];
        for (let i = 0; i < TABLE_EM_EI.length - 1; i++) {
            const r1 = TABLE_EM_EI[i];
            const r2 = TABLE_EM_EI[i + 1];
            if (rqdVal >= r1.rqd && rqdVal <= r2.rqd) {
                const t = (rqdVal - r1.rqd) / (r2.rqd - r1.rqd);
                return r1[key] + t * (r2[key] - r1[key]);
            }
        }
        return 0.05;
    }

    function interpolateAlphaE(ratioVal) {
        if (ratioVal <= 0) return TABLE_ALPHA_E[0].alpha;
        if (ratioVal >= 1.0) return TABLE_ALPHA_E[TABLE_ALPHA_E.length - 1].alpha;
        for (let i = 0; i < TABLE_ALPHA_E.length - 1; i++) {
            const r1 = TABLE_ALPHA_E[i];
            const r2 = TABLE_ALPHA_E[i + 1];
            if (ratioVal >= r1.ratio && ratioVal <= r2.ratio) {
                const t = (ratioVal - r1.ratio) / (r2.ratio - r1.ratio);
                return r1.alpha + t * (r2.alpha - r1.alpha);
            }
        }
        return 0.370;
    }

    function updateFormulaInfoText() {
        const type = container.querySelector('#pile_type').value;
        const qpVal = container.querySelector('#pile_qp_formula')?.value || 'oneill';
        const qsVal = container.querySelector('#pile_qs_formula')?.value || 'oneill';
        const infoBox = container.querySelector('#formula_info_box');

        if (!infoBox) return;

        let qpText = "";
        let qsText = "";

        if (type === 'CAST_ROCK') {
            if (qpVal === 'rock_case1') qpText = "q<sub>p</sub> = 2.5 &times; q<sub>u</sub> (신선암)";
            else qpText = "q<sub>p</sub> = [&radic;s + &radic;(m &times; &radic;s + s)] &times; q<sub>u</sub> (Hoek-Brown)";
            qsText = "토사: AASHTO(2012) &beta; 식 / 암반: Horvath & Kenney (1979)";
        } else {
            if (qpVal === 'oneill') qpText = "57.4 &times; N (N&le;75) / 4,309.2 kN/m² (O'Neill & Reese 1999)";
            else qpText = "100 &times; N_bar (사질토) / 6 &times; c<sub>u</sub> (건축기초 2004)";
            if (qsVal === 'oneill') qsText = "AASHTO LRFD (2012) &beta; 식";
            else qsText = "3.3 &times; N (사질토) / 1.0 &times; c<sub>u</sub> (점성토)";
        }

        infoBox.innerHTML = `
            <div style="font-weight: bold; color: #16a085; margin-bottom: 2px;">▶ 적용 산정식 개요</div>
            <div style="margin-left: 6px; line-height: 1.5;">
                • <strong>선단지지력 :</strong> ${qpText}<br>
                • <strong>주면마찰력 :</strong> ${qsText}
            </div>
        `;
    }

    function updateMethodFormulas() {
        const type = container.querySelector('#pile_type').value;
        const qpSelect = container.querySelector('#pile_qp_formula');
        const qsSelect = container.querySelector('#pile_qs_formula');
        if (!qpSelect) return;

        const savedQp = getVal('qp_formula', 'rock_case1');
        const savedQs = getVal('qs_formula', 'oneill');

        if (type === 'CAST_ROCK') {
            qpSelect.disabled = false;
            qpSelect.innerHTML = `
                <option value="rock_case1" ${savedQp === 'rock_case1' ? 'selected' : ''}>Case-1 (2.5 q_u)</option>
                <option value="rock_case2" ${savedQp === 'rock_case2' ? 'selected' : ''}>Case-2 (Hoek-Brown)</option>
            `;
            if (qsSelect) {
                qsSelect.disabled = true;
                qsSelect.innerHTML = `<option value="horvath" selected>O'Neill(토사) & H&K(암반)</option>`;
            }
        } else {
            qpSelect.disabled = false;
            qpSelect.innerHTML = `
                <option value="oneill" ${savedQp === 'oneill' ? 'selected' : ''}>O'Neill & Reese (1999)</option>
                <option value="aij" ${savedQp === 'aij' ? 'selected' : ''}>건축기초 구조설계지침 (2004)</option>
            `;
            if (qsSelect) {
                qsSelect.disabled = false;
                qsSelect.innerHTML = `
                    <option value="oneill" ${savedQs === 'oneill' ? 'selected' : ''}>O'Neill & Reese (1999) / AASHTO</option>
                    <option value="aij" ${savedQs === 'aij' ? 'selected' : ''}>건축기초 구조설계지침 (2004)</option>
                `;
            }
        }
        updateFormulaInfoText();
    }

    function updateUIState() {
        const type = container.querySelector('#pile_type').value;
        const grid2Label = container.querySelector('#grid2_label');
        const grid2Content = container.querySelector('#grid2_content');
        const row2Container = container.querySelector('#pile_row2_container');

        if (!grid2Content || !row2Container) return;

        row2Container.style.gridTemplateColumns = 'repeat(4, 1fr)';

        const initialRebarD = getVal('rebar_d', '25.40');
        const initialRebarFy = getVal('rebar_fy', '400');
        const initialRebarCount = getVal('rebar_count', '20');

        const rebarBoxHtml = `
            <div class="input-group" style="margin:0;">
                <label>보강철근 제원</label>
                <div style="display:flex; gap:2px; height:32px; align-items:center;">
                    <select id="pile_rebar_d" style="flex:1.2; min-width:0; height:100%; box-sizing:border-box; padding:2px; font-size:0.78em;">
                        <option value="9.53" ${initialRebarD === '9.53' ? 'selected' : ''}>D10</option>
                        <option value="12.70" ${initialRebarD === '12.70' ? 'selected' : ''}>D13</option>
                        <option value="15.90" ${initialRebarD === '15.90' ? 'selected' : ''}>D16</option>
                        <option value="19.10" ${initialRebarD === '19.10' ? 'selected' : ''}>D19</option>
                        <option value="22.20" ${initialRebarD === '22.20' ? 'selected' : ''}>D22</option>
                        <option value="25.40" ${initialRebarD === '25.40' ? 'selected' : ''}>D25</option>
                        <option value="28.60" ${initialRebarD === '28.60' ? 'selected' : ''}>D29</option>
                        <option value="31.80" ${initialRebarD === '31.80' ? 'selected' : ''}>D32</option>
                    </select>
                    <select id="pile_rebar_fy" style="flex:1.3; min-width:0; height:100%; box-sizing:border-box; padding:2px; font-size:0.78em;">
                        <option value="400" ${initialRebarFy === '400' ? 'selected' : ''}>SD400</option>
                        <option value="500" ${initialRebarFy === '500' ? 'selected' : ''}>SD500</option>
                    </select>
                    <input type="text" id="pile_rebar_count" value="${initialRebarCount}" style="width:38px; height:100%; text-align:center; box-sizing:border-box; padding:2px; font-size:0.85em;">
                    <span style="font-size:0.75em; font-weight:bold;">개</span>
                </div>
            </div>
        `;

        if (type === 'CAST_ROCK') {
            grid2Label.innerHTML = '암 유형 / RMR';
            grid2Content.innerHTML = `
                <div style="display:flex; gap:3px; width:100%; height:100%;">
                    <select id="pile_rock_type" style="flex:1.8; min-width:0; padding-left:4px; box-sizing:border-box; border:1px solid #ccc; font-size:0.75em;">
                        <option value="7">A : 탄산염암</option>
                        <option value="10">B : 이질암</option>
                        <option value="15">C : 사질암</option>
                        <option value="17" selected>D : 화성암</option>
                        <option value="25">E : 변성암</option>
                    </select>
                    <input type="number" id="pile_rmr" value="${getVal('rmr', '30')}" step="1" style="flex:1; min-width:0; text-align:center; box-sizing:border-box; padding:2px; border:1px solid #ccc; font-size:0.85em;">
                </div>
            `;

            row2Container.innerHTML = `
                <div class="input-group" style="margin:0;">
                    <label>선단지지력 산정식</label>
                    <select id="pile_qp_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>Joint 상태</label>
                    <select id="pile_joint_state" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.85em;">
                        <option value="closed" ${getVal('joint_state', 'closed') === 'closed' ? 'selected' : ''}>Closed Joints</option>
                        <option value="open" ${getVal('joint_state', 'closed') === 'open' ? 'selected' : ''}>Open Joints</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>RQD (%)</label>
                    <input type="number" id="pile_rqd" value="${getVal('rqd', '40')}" step="0.1" style="width:100%; height:32px; box-sizing:border-box; padding:4px; text-align:center;">
                </div>
                ${rebarBoxHtml}
            `;
        } else {
            grid2Label.textContent = '세부 구분';
            grid2Content.innerHTML = `<span style="color:#aaa; font-size:0.85em; width:100%; text-align:center;">- (없음) -</span>`;

            row2Container.innerHTML = `
                <div class="input-group" style="margin:0;">
                    <label>선단지지력 산정식</label>
                    <select id="pile_qp_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>주면마찰력 산정식</label>
                    <select id="pile_qs_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                </div>
                ${rebarBoxHtml}
            `;
        }
        updateMethodFormulas();
    }

    container.addEventListener('click', (e) => {
        if (e.target.id === 'pile_layer_add') {
            const nextIdx = pileLayers.length + 1;
            pileLayers.push({ name: `지층${nextIdx}`, type: 'sand', dz: 3.0, n_val: 30, gamma: 19.0, c_val: 0 });
            try { localStorage.setItem('geo_cast_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
            renderLayers();
        } else if (e.target.classList.contains('pl-del')) {
            pileLayers.splice(e.target.dataset.idx, 1);
            try { localStorage.setItem('geo_cast_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
            renderLayers();
        }
    });

    const calcBtn = container.querySelector('#calc-pile-btn');
    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            calculatePileCapacity();
        });
    }

    container.addEventListener('change', (e) => {
        if (e.target.id === 'pile_type') {
            updateUIState();
            renderLayers();
            try { localStorage.setItem('geo_cast_pile_type', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_qp_formula') {
            try { localStorage.setItem('geo_cast_pile_qp_formula', e.target.value); } catch(err){}
            updateFormulaInfoText();
        } else if (e.target.id === 'pile_qs_formula') {
            try { localStorage.setItem('geo_cast_pile_qs_formula', e.target.value); } catch(err){}
            updateFormulaInfoText();
        } else if (e.target.id === 'pile_gwt') {
            try { localStorage.setItem('geo_cast_pile_gwt', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_D') {
            try { localStorage.setItem('geo_cast_pile_D', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_fck') {
            try { localStorage.setItem('geo_cast_pile_fck', e.target.value); } catch(err){}
        } else if (e.target.id === 'grid5_val') {
            try { localStorage.setItem('geo_cast_pile_grid5_val', e.target.value); } catch(err){}
        }

        if (e.target.classList.contains('pl-name')) pileLayers[e.target.dataset.idx].name = e.target.value;
        if (e.target.classList.contains('pl-type')) pileLayers[e.target.dataset.idx].type = e.target.value;
        if (e.target.classList.contains('pl-dz')) {
            pileLayers[e.target.dataset.idx].dz = parseFloat(e.target.value) || 0;
            updatePileLength();
        }
        if (e.target.classList.contains('pl-n')) pileLayers[e.target.dataset.idx].n_val = parseFloat(e.target.value) || 0;
        if (e.target.classList.contains('pl-gamma')) pileLayers[e.target.dataset.idx].gamma = parseFloat(e.target.value) || 19.0;
        if (e.target.classList.contains('pl-c')) pileLayers[e.target.dataset.idx].c_val = parseFloat(e.target.value) || 0;
        try { localStorage.setItem('geo_cast_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
    });

    updateUIState();

    function updatePileLength() {
        const totalL = calcTotalL();
        const pileLVal = container.querySelector('#pile_L_val');
        if (pileLVal) {
            pileLVal.textContent = totalL.toFixed(2);
            try { localStorage.setItem('geo_cast_pile_L', totalL.toFixed(2)); } catch(err){}
        }
    }

    function renderLayers() {
        const tbody = container.querySelector('#pile_layers_body');
        if (!tbody) return;

        tbody.innerHTML = '';
        pileLayers.forEach((l, idx) => {
            const gammaVal = l.gamma !== undefined ? l.gamma : 19.0;

            tbody.innerHTML += `
                <tr>
                    <td style="padding:4px;"><input type="text" value="${l.name}" data-idx="${idx}" class="pl-name" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;">
                        <select data-idx="${idx}" class="pl-type" style="width:100%; box-sizing:border-box; padding:4px; font-size:0.9em;">
                            <option value="sand" ${l.type === 'sand' ? 'selected' : ''}>사질토</option>
                            <option value="clay" ${l.type === 'clay' ? 'selected' : ''}>점성토</option>
                            <option value="gravel" ${l.type === 'gravel' ? 'selected' : ''}>자갈층</option>
                            <option value="weathered_rock" ${l.type === 'weathered_rock' ? 'selected' : ''}>풍화암</option>
                            <option value="rock" ${l.type === 'rock' ? 'selected' : ''}>기반암(연암/경암)</option>
                        </select>
                    </td>
                    <td style="padding:4px;"><input type="number" value="${l.dz.toFixed(2)}" data-idx="${idx}" class="pl-dz" step="0.1" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${l.n_val}" data-idx="${idx}" class="pl-n" step="1" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${parseFloat(gammaVal).toFixed(1)}" data-idx="${idx}" class="pl-gamma" step="0.5" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${parseFloat(l.c_val).toFixed(1)}" data-idx="${idx}" class="pl-c" step="0.1" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><button type="button" class="pl-del" data-idx="${idx}" style="padding:3px 8px; background:#e74c3c; color:#fff; border:none; border-radius:3px; cursor:pointer;">-</button></td>
                </tr>
            `;
        });
        updatePileLength();
    }
    renderLayers();

    function calculatePileCapacity() {
        const p_type = container.querySelector('#pile_type').value;
        let pileLayersData = pileLayers;

        if (p_type === 'CAST_ROCK') {
            const lastLayerCheck = pileLayersData.length > 0 ? pileLayersData[pileLayersData.length - 1] : null;
            if (!lastLayerCheck || lastLayerCheck.type !== 'rock') {
                alert("⚠️ 현장타설말뚝(기반암) 검토 시 최하단 지층의 토성 구분을 '기반암(연암/경암)'으로 지정해주세요.");
                return;
            }
        }

        const qp_formula_key = container.querySelector('#pile_qp_formula')?.value || 'oneill';
        const qs_formula_key = container.querySelector('#pile_qs_formula')?.value || 'oneill';

        const qpSelectElem = container.querySelector('#pile_qp_formula');
        const qp_formula_name = qpSelectElem ? qpSelectElem.options[qpSelectElem.selectedIndex]?.text : '';

        const qsSelectElem = container.querySelector('#pile_qs_formula');
        const qs_formula_name = qsSelectElem ? qsSelectElem.options[qsSelectElem.selectedIndex]?.text : '';

        const D_mm = parseFloat(container.querySelector('#pile_D').value) || 1000;
        const D = D_mm / 1000.0;
        const gwt = parseFloat(container.querySelector('#pile_gwt')?.value) || 2.0;

        const user_fck = parseFloat(container.querySelector('#pile_fck')?.value) || 27.0;
        const user_rebar_d_mm = parseFloat(container.querySelector('#pile_rebar_d')?.value) || 25.40;
        const user_rebar_fy_MPa = parseFloat(container.querySelector('#pile_rebar_fy')?.value) || 400;
        const user_rebar_count = parseInt(container.querySelector('#pile_rebar_count')?.value) || 0;

        let user_joint_state = 'closed', user_rqd = 40.0;
        let alpha_e_val = 0.370;

        if (p_type === 'CAST_ROCK') {
            user_joint_state = container.querySelector('#pile_joint_state')?.value || 'closed';
            user_rqd = parseFloat(container.querySelector('#pile_rqd')?.value) || 40.0;
            let em_ei_val = interpolateEmEi(user_rqd, user_joint_state);
            alpha_e_val = interpolateAlphaE(em_ei_val);
        }

        const P_norm = parseFloat(container.querySelector('#pile_P_norm').value) || 0;
        const P_seis = parseFloat(container.querySelector('#pile_P_seis').value) || 0;

        let lastLayer = pileLayersData.length > 0 ? pileLayersData[pileLayersData.length - 1] : { name: '지지층', type: 'sand', n_val: 50, gamma: 20.0, c_val: 0 };
        let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
        let c_tip = parseFloat(lastLayer.c_val) || 0;
        const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
        
        let q_p = 0; 

        if (p_type === 'CAST_ROCK') {
            if (qp_formula_key === 'rock_case1') {
                q_p = 2.5 * c_tip;
            } else {
                let hb_mi = parseInt(container.querySelector('#pile_rock_type')?.value) || 17;
                let input_rmr = parseFloat(container.querySelector('#pile_rmr')?.value) || 30;
                let hbRes = interpolateHoekBrown(input_rmr, hb_mi);
                let factor = Math.sqrt(hbRes.s) + Math.sqrt(hbRes.m * Math.sqrt(hbRes.s) + hbRes.s);
                q_p = factor * c_tip;
            }
        } else {
            q_p = raw_N_tip <= 75 ? 57.4 * raw_N_tip : 4309.2;
        }

        const Qup = q_p * Ap;

        const As = Math.PI * D;
        let total_Qus = 0;

        let soilLayers = pileLayersData.filter(l => l.type !== 'rock');
        let sum_N_dz = 0, sum_dz = 0;
        soilLayers.forEach(l => {
            let nval = parseFloat(l.n_val) || 0;
            let dz = parseFloat(l.dz) || 0;
            sum_N_dz += nval * dz; sum_dz += dz;
        });
        const N_60 = sum_dz > 0 ? (sum_N_dz / sum_dz) : 0;

        let cum_depth = 0, cum_sigma_v = 0;

        pileLayersData.forEach(l => {
            let f_unit = 0;
            let dz_i = parseFloat(l.dz) || 0;
            let gamma_i = parseFloat(l.gamma) || 19.0;
            let c_val_i = parseFloat(l.c_val) || 0; 

            let z_mid = cum_depth + 0.5 * dz_i;
            let sigma_v_mid = cum_sigma_v + gamma_i * (0.5 * dz_i);
            let u_mid = Math.max(0, (z_mid - gwt) * 9.81);
            let sigma_v_prime = Math.max(0, sigma_v_mid - u_mid);

            if (l.type === 'rock' && p_type === 'CAST_ROCK') {
                let P_a = 0.101; 
                let qu_MPa = c_val_i / 1000.0; 
                let fs_MPa = 0.65 * alpha_e_val * P_a * Math.pow(qu_MPa / P_a, 0.5); 
                let fs_limit_MPa = 7.8 * P_a * Math.pow(user_fck / P_a, 0.5); 
                f_unit = Math.min(fs_MPa, fs_limit_MPa) * 1000.0; 
            } else if (qs_formula_key === 'oneill') {
                if (l.type === 'sand' || l.type === 'weathered_rock') {
                    let z_mm = z_mid * 1000.0;
                    let beta_calc = 1.5 - (7.7e-3 * Math.sqrt(z_mm));
                    let beta = N_60 > 15 ? beta_calc : (N_60 / 15.0) * beta_calc;
                    let beta_clamped = Math.max(0.25, Math.min(1.20, beta));
                    f_unit = Math.min(190.0, beta_clamped * sigma_v_prime);
                } else {
                    f_unit = Math.min(190.0, 0.55 * c_val_i);
                }
            } else {
                let isGranular = ['sand', 'gravel', 'weathered_rock'].includes(l.type);
                f_unit = isGranular ? Math.min(100.0, 3.3 * l.n_val) : Math.min(100.0, 1.0 * c_val_i);
            }

            total_Qus += f_unit * dz_i * As;

            cum_depth += dz_i;
            cum_sigma_v += gamma_i * dz_i;
        });

        const Qu_total = Qup + total_Qus;
        const Qa_soil_norm = Qu_total / 3.0;
        const Qa_soil_seis = Qu_total / 2.0;

        const Ac_gross = Ap; 
        const db_m = user_rebar_d_mm / 1000.0;
        const Ab_single = (Math.PI * Math.pow(db_m, 2)) / 4.0; 
        const Ast = user_rebar_count * Ab_single; 
        const Ac_net = Math.max(0, Ac_gross - Ast); 
        const fca_kNm2 = Math.min(0.25 * user_fck, 8.5) * 1000.0; 
        const fsa_rebar_kNm2 = 0.40 * user_rebar_fy_MPa * 1000.0; 
        const Q_mat_base = (fca_kNm2 * Ac_net) + (fsa_rebar_kNm2 * Ast); 

        const Q_app_norm = Math.min(Qa_soil_norm, Q_mat_base);
        const Q_app_seis = Math.min(Qa_soil_seis, Q_mat_base);

        const status_p_norm = P_norm <= Q_app_norm ? '안정 (O.K)' : 'NG';
        const status_p_seis = P_seis <= Q_app_seis ? '안정 (O.K)' : 'NG';

        const summaryRowsHtml = `
            <tr>
                <td rowspan="2" style="background:#eaf2f8; font-weight:bold;">연직지지력 검토</td>
                <td>평상시 (상시)</td>
                <td style="font-weight:bold; color:#2980b9;">P = ${P_norm.toFixed(1)} kN</td>
                <td>Q<sub>a</sub> = ${Q_app_norm.toFixed(1)} kN</td>
                <td style="font-weight:bold; color:${P_norm <= Q_app_norm ? '#27ae60' : '#c0392b'};">${status_p_norm}</td>
            </tr>
            <tr>
                <td>내진시 (지진시)</td>
                <td style="font-weight:bold; color:#2980b9;">P = ${P_seis.toFixed(1)} kN</td>
                <td>Q<sub>a</sub> = ${Q_app_seis.toFixed(1)} kN</td>
                <td style="font-weight:bold; color:${P_seis <= Q_app_seis ? '#27ae60' : '#c0392b'};">${status_p_seis}</td>
            </tr>
        `;

        const resultDiv = container.querySelector('#pile-result');
        if (!resultDiv) return;
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div class="section-title">[현장타설말뚝 지지력 최종 검토 요약]</div>
            <div class="table-container">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th colspan="2">검토 항목</th>
                            <th>작용하중</th>
                            <th>허용지지력</th>
                            <th>검토 결과</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summaryRowsHtml}
                    </tbody>
                </table>
            </div>

            <div class="section-title">[검증 1] 지반에 의한 연직 허용지지력 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                <strong>(1) 말뚝 선단지지력 (Q<sub>up</sub>)</strong><br>
                • 적용 산정식 : <strong>${qp_formula_name}</strong><br>
                • 최하단 지지층 : <strong>${lastLayer.name}</strong> (c / q<sub>u</sub> = ${c_tip} kPa)<br>
                • 선단면적 A<sub>p</sub> = ${Ap.toFixed(5)} m² / q<sub>p</sub> = ${q_p.toFixed(1)} kN/m²<br>
                • <strong>극한선단지지력 Q<sub>up</sub></strong> = q<sub>p</sub> &times; A<sub>p</sub> = <span style="font-weight:bold; color:#2980b9;">${Qup.toFixed(1)} kN</span>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                <strong>(2) 말뚝 주면마찰력 (Q<sub>us</sub>)</strong><br>
                • 적용 산정식 : <strong>${qs_formula_name}</strong><br>
                • <strong>총 극한주면마찰력 Q<sub>us</sub></strong> = <span style="font-weight:bold; color:#2980b9;">${total_Qus.toFixed(1)} kN</span>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px;">
                <strong>(3) 지반에 의한 허용지지력 (Q<sub>a,soil</sub>)</strong><br>
                • 연직 극한지지력 Q<sub>u</sub> = Q<sub>up</sub> + Q<sub>us</sub> = <strong>${Qu_total.toFixed(1)} kN</strong><br>
                • 평상시 허용지지력 (F.S = 3.0) = <strong>${Qa_soil_norm.toFixed(1)} kN</strong> / 내진시 (F.S = 2.0) = <strong>${Qa_soil_seis.toFixed(1)} kN</strong>
            </div>

            <div class="section-title">[검증 2] 현장타설말뚝 본체 허용압축강도 (Q<sub>mat</sub>) 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height: 1.6;">
                • 콘크리트 순단면적 (A<sub>c</sub>) = ${Ac_net.toFixed(4)} m² / 철근 단면적 (A<sub>st</sub>) = ${Ast.toFixed(6)} m²<br>
                • 콘크리트 허용압축응력 (f<sub>ca</sub>) = ${(fca_kNm2/1000).toFixed(1)} MPa / 철근 허용응력 (f<sub>sa</sub>) = ${(fsa_rebar_kNm2/1000).toFixed(1)} MPa<br>
                • <strong>말뚝 재료 내하력 (Q<sub>mat</sub>)</strong> = f<sub>ca</sub>A<sub>c</sub> + f<sub>sa</sub>A<sub>st</sub> = <span style="color:#2980b9; font-weight:bold;">${Q_mat_base.toFixed(1)} kN</span>
            </div>
        `;
    }
}
