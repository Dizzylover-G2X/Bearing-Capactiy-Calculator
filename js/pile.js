export function initPileModule(container) {
    const getVal = (id, defaultVal) => {
        try {
            return localStorage.getItem('geo_pile_' + id) ?? defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

    // ---------------------------------------------------------
    // 수식 내 분수(/) 형태를 시각적 분수 폼으로 바꿔주는 유틸리티
    // ---------------------------------------------------------
    const frac = (num, den) => `<span style="display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; margin:0 4px;"><span style="border-bottom:1px solid #2c3e50; padding:1px 4px;">${num}</span><span style="padding:1px 4px;">${den}</span></span>`;

    // ---------------------------------------------------------
    // 표준 제원 DB
    // ---------------------------------------------------------
    const PHC_DB = {
        "350": { t: 60, A: 900, B: 920, C: 910 },
        "400": { t: 65, A: 1120, B: 1150, C: 1130 },
        "450": { t: 70, A: 1370, B: 1410, C: 1380 },
        "500": { t: 80, A: 1730, B: 1780, C: 1750 },
        "600": { t: 90, A: 2360, B: 2430, C: 2390 },
        "700": { t: 100, A: 3090, B: 3180, C: 3120 },
        "800": { t: 110, A: 3910, B: 4020, C: 3950 }
    };

    const STEEL_DB = {
        "406.4": { displayD: "406.4", tList: [9, 10, 11, 12] },
        "508.0": { displayD: "508.0", tList: [9, 10, 11, 12, 13, 14] },
        "609.6": { displayD: "609.6", tList: [9, 10, 11, 12, 13, 14, 15, 16] },
        "711.2": { displayD: "711.2", tList: [9, 10, 11, 12, 13, 14, 15, 16] },
        "812.8": { displayD: "812.8", tList: [9, 10, 11, 12, 13, 14, 15, 16] },
        "914.4": { displayD: "914.4", tList: [12, 13, 14, 15, 16, 17, 18, 19] },
        "1016.0": { displayD: "1016.0", tList: [12, 13, 14, 15, 16, 17, 18, 19] }
    };

    const STEEL_GRADE_MAP = {
        "STP275": 275000,
        "STP355": 355000,
        "STP380": 380000,
        "STP550": 550000
    };

    let savedD = parseFloat(getVal('D', '500'));
    if (savedD < 10) savedD = savedD * 1000;

    let pileLayers;
    try {
        pileLayers = JSON.parse(localStorage.getItem('geo_pile_layers'));
    } catch (e) {
        pileLayers = null;
    }

    if (!pileLayers || !Array.isArray(pileLayers) || pileLayers.length === 0) {
        pileLayers = [
            { name: '지층1', type: 'sand', dz: 4.40, n_val: 50, gamma: 20.0, c_val: 25.0 },
            { name: '지층2', type: 'weathered_rock', dz: 5.60, n_val: 50, gamma: 21.0, c_val: 32.0 }
        ];
        try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch (e) {}
    }

    const calcTotalL = () => pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

    const initialType = getVal('type', 'PHC');
    const initialT1 = parseFloat(getVal('t1', '1.0')).toFixed(1);
    const initialMethod = getVal('method', 'bored');
    const initialGWT = getVal('gwt', '2.0');
    const cpType = getVal('Cp_type', 'avg');
    const defaultEp = initialType === 'STEEL' ? '200000000' : '39200000';

    container.innerHTML = `
        <h3>1. 설계자료 입력 (말뚝기초 연직/수평지지력 및 침하량 검토)</h3>
        
        <!-- 1. 말뚝기초 제원 -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 말뚝기초 제원 및 시공 조건</div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px;">
            <div class="input-group" style="margin:0;">
                <label>말뚝 종류</label>
                <select id="pile_type" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.88em;">
                    <option value="PHC" ${initialType === 'PHC' ? 'selected' : ''}>PHC 말뚝</option>
                    <option value="STEEL" ${initialType === 'STEEL' ? 'selected' : ''}>강관 말뚝</option>
                    <option value="CAST" ${initialType === 'CAST' ? 'selected' : ''}>현장타설말뚝(토사)</option>
                    <option value="CAST_ROCK" ${initialType === 'CAST_ROCK' ? 'selected' : ''}>현장타설말뚝(기반암)</option>
                    <option value="PC" ${initialType === 'PC' ? 'selected' : ''}>PC 말뚝</option>
                    <option value="RC" ${initialType === 'RC' ? 'selected' : ''}>RC 말뚝</option>
                </select>
            </div>
            <div class="input-group" style="margin:0;">
                <label id="grid2_label">세부 구분</label>
                <div id="grid2_content" style="height:32px; display:flex; align-items:center;"></div>
            </div>
            <div class="input-group" style="margin:0;">
                <label>규격/직경 D(mm)</label>
                <div style="display:flex; gap:4px; height:32px;">
                    <select id="pile_spec_select" style="width:55%; height:100%; box-sizing:border-box; padding:2px; font-size:0.85em;"></select>
                    <input type="number" id="pile_D" value="${savedD}" step="0.1" placeholder="D(mm)" style="width:45%; height:100%; text-align:center; box-sizing:border-box; padding:2px; font-size:0.88em;">
                </div>
            </div>
            <div class="input-group" style="margin:0;">
                <label>두께 선택 / 두께 t (mm)</label>
                <div style="display:flex; gap:4px; height:32px;">
                    <select id="pile_t_select" style="width:55%; height:100%; box-sizing:border-box; padding:2px; font-size:0.85em;"></select>
                    <input type="number" id="pile_t" value="${getVal('t', '80')}" step="1" style="width:45%; height:100%; text-align:center; box-sizing:border-box; padding:2px; font-size:0.88em;">
                </div>
            </div>
            <div class="input-group" style="margin:0;">
                <label id="grid5_label" style="font-size: 0.78em; letter-spacing: -0.6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">허용축하중 P<sub>a</sub> (kN)</label>
                <input type="number" id="grid5_val" value="${getVal('grid5_val', '1730')}" step="0.1" style="width:100%; height:32px; box-sizing:border-box; padding:4px; text-align:center; font-weight:bold;">
            </div>
        </div>

        <!-- 2. 산정식 및 조건 -->
        <div id="pile_row2_container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px;"></div>
        <div id="formula_info_box" style="margin-bottom: 15px; font-size: 0.83em; color: #2c3e50; background: #f4f6f7; padding: 8px 12px; border-radius: 4px; border-left: 4px solid #16a085;"></div>

        <!-- 3. 작용 하중 입력 (연직하중 및 수평하중) -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400; font-size: 0.95em;">■ 작용 하중 (연직/수평하중 및 휨모멘트)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;">
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#d35400;">평상시 연직 P<sub>norm</sub> (kN)</label>
                <input type="number" id="pile_P_norm" value="${getVal('P_norm', '2062.8')}" step="0.1">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#c0392b;">내진시 연직 P<sub>seis</sub> (kN)</label>
                <input type="number" id="pile_P_seis" value="${getVal('P_seis', '1728.6')}" step="0.1">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#d35400;">평상시 수평 H<sub>norm</sub> (kN)</label>
                <input type="number" id="pile_H_norm" value="${getVal('H_norm', '120.0')}" step="0.1">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#c0392b;">내진시 수평 H<sub>seis</sub> (kN)</label>
                <input type="number" id="pile_H_seis" value="${getVal('H_seis', '180.0')}" step="0.1">
            </div>
            <div class="input-group" style="background:#fff; margin:0; grid-column: span 2;">
                <label style="color:#2980b9;">평상시 휨모멘트 M<sub>norm</sub> (kN·m)</label>
                <input type="number" id="pile_M_norm" value="${getVal('M_norm', '45.0')}" step="0.1">
            </div>
            <div class="input-group" style="background:#fff; margin:0; grid-column: span 2;">
                <label style="color:#8e44ad;">내진시 휨모멘트 M<sub>seis</sub> (kN·m)</label>
                <input type="number" id="pile_M_seis" value="${getVal('M_seis', '75.0')}" step="0.1">
            </div>
        </div>

        <!-- 4. 침하량 및 수평지지력 산정 조건 -->
        <div id="pile_analysis_input_sec">
            <div style="font-weight: bold; margin-bottom: 8px; color: #8e44ad; font-size: 0.95em;">■ 변위 및 침하량 산정 조건 (연직 침하량 & Chang 수평 해석)</div>
            <div class="input-grid" style="margin-bottom: 15px; background-color: #f5eef8; padding: 10px; border-radius: 5px; border: 1px solid #d7bde2; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;">
                <div class="input-group" style="background:#fff; margin:0;">
                    <label style="color:#8e44ad;">말뚝 탄성계수 E<sub>p</sub> (kN/m²)</label>
                    <input type="number" id="pile_Ep" value="${getVal('Ep', defaultEp)}" step="100000">
                </div>
                <div class="input-group" style="background:#fff; margin:0;">
                    <label>주면마찰 분포계수 &alpha;<sub>s</sub></label>
                    <select id="pile_alpha_s" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.9em; text-align:center;">
                        <option value="0.50" ${getVal('alpha_s', '0.67') === '0.50' ? 'selected' : ''}>0.50 (균등/포물선)</option>
                        <option value="0.67" ${getVal('alpha_s', '0.67') === '0.67' ? 'selected' : ''}>0.67 (삼각형)</option>
                    </select>
                </div>
                <div class="input-group" style="background:#fff; margin:0;">
                    <label>경험계수 C<sub>p</sub> 산정방식</label>
                    <div style="display:flex; gap:4px; height:32px;">
                        <select id="pile_Cp_type" style="flex:1; height:100%; box-sizing:border-box; padding:2px; font-size:0.85em;">
                            <option value="avg" ${cpType === 'avg' ? 'selected' : ''}>평균 적용</option>
                            <option value="min" ${cpType === 'min' ? 'selected' : ''}>최소 적용</option>
                            <option value="max" ${cpType === 'max' ? 'selected' : ''}>최대 적용</option>
                            <option value="custom" ${cpType === 'custom' ? 'selected' : ''}>임의(직접입력)</option>
                        </select>
                        <input type="number" id="pile_Cp_custom" value="${getVal('Cp_custom', '0.09')}" step="0.01" style="width:45%; height:100%; text-align:center; box-sizing:border-box; padding:2px; font-size:0.88em; ${cpType === 'custom' ? 'display:block;' : 'display:none;'}">
                    </div>
                </div>
                <div class="input-group" style="background:#fff; margin:0;">
                    <label style="color:#d35400;">허용 연직침하량 (mm)</label>
                    <input type="number" id="pile_allow_settle" value="${getVal('allow_settle', '25.0')}" step="0.1">
                </div>
                <div class="input-group" style="background:#fff; margin:0;">
                    <label style="color:#27ae60;">두부 구속조건 (Chang)</label>
                    <select id="pile_head_fix" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.9em; text-align:center;">
                        <option value="fixed" ${getVal('head_fix', 'fixed') === 'fixed' ? 'selected' : ''}>고정단 (Fixed Head)</option>
                        <option value="free" ${getVal('head_fix', 'fixed') === 'free' ? 'selected' : ''}>자유단 (Free Head)</option>
                    </select>
                </div>
                <div class="input-group" style="background:#fff; margin:0;">
                    <label style="color:#27ae60;">지반 변형계수 E<sub>0</sub> (kN/m²)</label>
                    <input type="number" id="pile_E0" value="${getVal('E0', '28000')}" step="1000" placeholder="미입력시 2800N 적용">
                </div>
                <div class="input-group" style="background:#fff; margin:0; grid-column: span 2;">
                    <label style="color:#27ae60;">허용 수평변위 &delta;<sub>a</sub> (mm)</label>
                    <input type="number" id="pile_allow_lat_disp" value="${getVal('allow_lat_disp', '15.0')}" step="0.1">
                </div>
            </div>
        </div>

        <!-- 5. 지층 정보 -->
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

        <button type="button" class="action-btn" id="calc-pile-btn" style="margin-top: 10px; cursor: pointer;">말뚝 지지력, 침하량 및 수평변위 종합 산정</button>
        <div id="pile-result" class="result-box" style="display: none;"></div>
    `;

    function updateFormulaInfoText() {
        const type = container.querySelector('#pile_type').value;
        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qpVal = container.querySelector('#pile_qp_formula').value;
        const qsVal = container.querySelector('#pile_qs_formula')?.value || 'oneill';
        const infoBox = container.querySelector('#formula_info_box');

        if (!infoBox) return;

        let qpText = "";
        let qsText = "";

        if (type === 'CAST_ROCK') {
            if (qpVal === 'rock_case1') qpText = "q<sub>p</sub> = 2.5 &times; q<sub>u</sub> (암반절리 미고려 / 신선암)";
            else qpText = "q<sub>p</sub> = [&radic;s + &radic;(m &times; &radic;s + s)] &times; q<sub>u</sub> (여러방향 절리, Hoek-Brown 1988 적용)";
            qsText = "토사: AASHTO(2012) &beta; 산정식 / 암반: Horvath & Kenney (1979)";
        } else if (type === 'CAST') {
            if (qpVal === 'oneill') qpText = "57.4 &times; N (N&le;75) / 4,309.2 kN/m² (N>75) [O'Neill & Reese (1999)]";
            else qpText = "100 &times; N_bar (사질토) / 6 &times; c<sub>u</sub> (점성토) [건축기초 구조설계지침 (2004)]";
            if (qsVal === 'oneill') qsText = "AASHTO LRFD (2012) &beta; 산정식 적용";
            else qsText = "3.3 &times; N (사질토) / 1.0 &times; c<sub>u</sub> (점성토)";
        } else if (method === 'driven') {
            qpText = "300 &times; N (N&le;60)";
            if (qsVal === 'lh') qsText = "2.0 &times; N (사질토), 5.0 &times; q<sub>u</sub> (점성토)";
            else qsText = "2.0 &times; N (사질토), 1.0 &times; c<sub>u</sub> (점성토)";
        } else {
            if (qpVal === 'lh') qpText = "250 &times; N (N&le;60)";
            else qpText = "200 &times; N (사질토), 6 &times; c<sub>u</sub> (점성토)";
            if (qsVal === 'lh') qsText = "2.0 &times; N (사질토), 5.0 &times; q<sub>u</sub> (점성토)";
            else qsText = "2.5 &times; N (사질토), 0.8 &times; c<sub>u</sub> (점성토)";
        }

        infoBox.innerHTML = `
            <div style="font-weight: bold; color: #16a085; margin-bottom: 2px;">▶ 적용 산정식 개요</div>
            <div style="margin-left: 6px; line-height: 1.5;">
                • <strong>선단지지력 :</strong> ${qpText}<br>
                • <strong>주면마찰력 :</strong> ${qsText}<br>
                • <strong>수평 해석 :</strong> Chang 방법을 통한 두부 수평변위(&delta;) 및 수평 지지력 검토
            </div>
        `;
    }

    function updateMethodFormulas() {
        const type = container.querySelector('#pile_type').value;
        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qpSelect = container.querySelector('#pile_qp_formula');
        const qsSelect = container.querySelector('#pile_qs_formula');
        if (!qpSelect) return;

        const savedQp = getVal('qp_formula', 'road');
        const savedQs = getVal('qs_formula', 'road');

        if (type === 'CAST_ROCK') {
            qpSelect.disabled = false;
            qpSelect.innerHTML = `
                <option value="rock_case1" ${savedQp === 'rock_case1' ? 'selected' : ''}>Case-1 (2.5 q_u)</option>
                <option value="rock_case2" ${savedQp === 'rock_case2' ? 'selected' : ''}>Case-2 (여러방향 절리)</option>
            `;
            if (qsSelect) {
                qsSelect.disabled = true;
                qsSelect.innerHTML = `<option value="horvath" selected>O'Neill(토사) & H&K (암반)</option>`;
            }
        } else if (type === 'CAST') {
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
        } else if (method === 'driven') {
            qpSelect.innerHTML = `<option value="driven_standard" selected>항타공법 표준식 (300N)</option>`;
            qpSelect.disabled = true;
            if (qsSelect) {
                qsSelect.disabled = false;
                qsSelect.innerHTML = `
                    <option value="road" ${savedQs === 'road' ? 'selected' : ''}>도로교설계기준해설 (2008)</option>
                    <option value="lh" ${savedQs === 'lh' ? 'selected' : ''}>주택공사 설계개선지침 (2008)</option>
                `;
            }
        } else {
            qpSelect.disabled = false;
            qpSelect.innerHTML = `
                <option value="road" ${savedQp === 'road' ? 'selected' : ''}>도로교설계기준해설 (2008)</option>
                <option value="lh" ${savedQp === 'lh' ? 'selected' : ''}>주택공사 설계개선지침 (2008)</option>
            `;
            if (qsSelect) {
                qsSelect.disabled = false;
                qsSelect.innerHTML = `
                    <option value="road" ${savedQs === 'road' ? 'selected' : ''}>도로교설계기준해설 (2008)</option>
                    <option value="lh" ${savedQs === 'lh' ? 'selected' : ''}>주택공사 설계개선지침 (2008)</option>
                `;
            }
        }

        updateFormulaInfoText();
    }

    function updateUIState() {
        const type = container.querySelector('#pile_type').value;
        const grid2Label = container.querySelector('#grid2_label');
        const grid2Content = container.querySelector('#grid2_content');
        const grid5Label = container.querySelector('#grid5_label');
        const grid5Val = container.querySelector('#grid5_val');
        const specSelect = container.querySelector('#pile_spec_select');
        const row2Container = container.querySelector('#pile_row2_container');
        const epInput = container.querySelector('#pile_Ep');

        if (!specSelect || !grid2Content || !row2Container) return;

        if (epInput) {
            if (type === 'STEEL') {
                epInput.value = '200000000';
            } else if (type === 'PHC') {
                epInput.value = '39200000';
            } else if (type === 'CAST' || type === 'CAST_ROCK') {
                let fckVal = parseFloat(container.querySelector('#pile_fck')?.value) || 27.0;
                let Ec = 8500 * Math.cbrt(fckVal + 4) * 1000.0;
                epInput.value = Ec.toFixed(0);
            }
            try { localStorage.setItem('geo_pile_Ep', epInput.value); } catch(e){}
        }

        specSelect.innerHTML = '';

        if (type === 'CAST' || type === 'CAST_ROCK') {
            row2Container.style.gridTemplateColumns = 'repeat(5, 1fr)';
        } else {
            row2Container.style.gridTemplateColumns = 'repeat(4, 1fr)';
        }

        if (type === 'PHC') {
            grid2Label.textContent = 'PHC 종 구분';
            grid2Content.innerHTML = `
                <select id="phc_class" style="width:100%; height:100%; box-sizing:border-box; padding:4px; font-size:0.88em;">
                    <option value="A">A종</option>
                    <option value="B">B종</option>
                    <option value="C">C종</option>
                </select>
            `;
            grid5Label.innerHTML = '허용축하중 P<sub>a</sub> (kN)';
            specSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            Object.keys(PHC_DB).forEach(d => { specSelect.innerHTML += `<option value="${d}">D${d}</option>`; });
            specSelect.value = '500';

            row2Container.innerHTML = `
                <div class="input-group" style="margin:0;">
                    <label>선단지지력 산정식</label>
                    <select id="pile_qp_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>주면마찰력 산정식</label>
                    <select id="pile_qs_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>시공 공법</label>
                    <select id="pile_method" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.88em;">
                        <option value="driven">항타공법</option>
                        <option value="bored" selected>매입말뚝공법</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>이음 방법 및 개소</label>
                    <div style="display:flex; gap:4px; height: 32px; align-items:center;">
                        <select id="pile_joint_type" style="flex:1; height:100%; box-sizing:border-box; padding:2px; font-size:0.85em;">
                            <option value="weld">용접 이음</option>
                            <option value="bolt">볼트 이음</option>
                            <option value="none">이음 없음</option>
                        </select>
                        <input type="number" id="pile_joint_count" value="0" min="0" style="width:40px; height:100%; text-align:center; box-sizing:border-box; padding:2px; font-size:0.85em;">
                        <span style="font-size:0.82em; font-weight:bold; color:#2c3e50; white-space:nowrap;">개소</span>
                    </div>
                </div>
            `;
        } else if (type === 'STEEL') {
            grid2Label.textContent = '강종 / 부식두께(mm)';
            grid2Content.innerHTML = `
                <div style="display:flex; gap:3px; width:100%; height:100%;">
                    <select id="steel_grade" style="flex:1; min-width:0; box-sizing:border-box; padding:2px; font-size:0.82em;">
                        <option value="STP275">STP 275</option>
                        <option value="STP355">STP 355</option>
                        <option value="STP380">STP 380</option>
                        <option value="STP550">STP 550</option>
                    </select>
                    <input type="number" id="pile_t1" value="${initialT1}" step="0.1" placeholder="t1" title="부식두께 t1(mm)" style="width:48px; text-align:center; box-sizing:border-box; padding:2px; border:1px solid #ccc; font-size:0.85em;">
                </div>
            `;
            grid5Label.innerHTML = '허용압축응력 &sigma;<sub>ca</sub> (kN/m²)';
            specSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            Object.keys(STEEL_DB).forEach(d => { specSelect.innerHTML += `<option value="${d}">D${STEEL_DB[d].displayD}</option>`; });
            specSelect.value = '508.0';

            row2Container.innerHTML = `
                <div class="input-group" style="margin:0;">
                    <label>선단지지력 산정식</label>
                    <select id="pile_qp_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>주면마찰력 산정식</label>
                    <select id="pile_qs_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>시공 공법</label>
                    <select id="pile_method" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.88em;">
                        <option value="driven" ${initialMethod === 'driven' ? 'selected' : ''}>항타공법</option>
                        <option value="bored" ${initialMethod === 'bored' ? 'selected' : ''}>매입말뚝공법</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>이음 방법 및 개소</label>
                    <div style="display:flex; gap:4px; height: 32px; align-items:center;">
                        <select id="pile_joint_type" style="flex:1; height:100%; box-sizing:border-box; padding:2px; font-size:0.85em;">
                            <option value="weld" ${getVal('joint_type', 'weld') === 'weld' ? 'selected' : ''}>용접 이음</option>
                            <option value="bolt" ${getVal('joint_type', 'weld') === 'bolt' ? 'selected' : ''}>볼트 이음</option>
                            <option value="none" ${getVal('joint_type', 'weld') === 'none' ? 'selected' : ''}>이음 없음</option>
                        </select>
                        <input type="number" id="pile_joint_count" value="${getVal('joint_count', '0')}" min="0" style="width:40px; height:100%; text-align:center; box-sizing:border-box; padding:2px; font-size:0.85em;">
                        <span style="font-size:0.82em; font-weight:bold; color:#2c3e50; white-space:nowrap;">개소</span>
                    </div>
                </div>
            `;
        } else if (type === 'CAST' || type === 'CAST_ROCK') {
            if (type === 'CAST_ROCK') {
                grid2Label.innerHTML = '암의 유형 / RMR';
                grid2Content.innerHTML = `
                    <div style="display:flex; gap:3px; width:100%; height:100%;">
                        <select id="pile_rock_type" style="flex:1.8; min-width:0; text-align:left; padding-left:4px; box-sizing:border-box; border:1px solid #ccc; font-size:0.75em;">
                            <option value="7">A : 벽개발달 탄산염암</option>
                            <option value="10">B : 석화 이질암</option>
                            <option value="15">C : 뚜렷한 벽개 사질암</option>
                            <option value="17" selected>D : 세립결정 화성암</option>
                            <option value="25">E : 조립결정 화성,변성암</option>
                        </select>
                        <input type="number" id="pile_rmr" value="${getVal('rmr', '30')}" step="1" style="flex:1; min-width:0; text-align:center; box-sizing:border-box; padding:2px; border:1px solid #ccc; font-size:0.85em;">
                    </div>
                `;
            } else {
                grid2Label.textContent = '세부 구분';
                grid2Content.innerHTML = `<span style="color:#aaa; font-size:0.85em; width:100%; text-align:center;">- (없음) -</span>`;
            }
            grid5Label.innerHTML = '허용압축응력 &sigma;<sub>ca</sub> (MPa)';
            specSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            grid5Val.value = getVal('grid5_val', '35.0');

            const initialFck = getVal('fck', '27');
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
                            <option value="34.90" ${initialRebarD === '34.90' ? 'selected' : ''}>D35</option>
                            <option value="38.10" ${initialRebarD === '38.10' ? 'selected' : ''}>D38</option>
                        </select>
                        <select id="pile_rebar_fy" style="flex:1.3; min-width:0; height:100%; box-sizing:border-box; padding:2px; font-size:0.78em;">
                            <option value="400" ${initialRebarFy === '400' ? 'selected' : ''}>SD400</option>
                            <option value="500" ${initialRebarFy === '500' ? 'selected' : ''}>SD500</option>
                        </select>
                        <input type="text" id="pile_rebar_count" value="${initialRebarCount}" style="width:38px; height:100%; text-align:center; box-sizing:border-box; padding:2px; font-size:0.85em;">
                        <span style="font-size:0.75em; font-weight:bold; color:#2c3e50; white-space:nowrap;">개</span>
                    </div>
                </div>
            `;

            if (type === 'CAST_ROCK') {
                const initialJointState = getVal('joint_state', 'closed');
                const initialRqd = getVal('rqd', '4.0');

                row2Container.innerHTML = `
                    <div class="input-group" style="margin:0;">
                        <label>선단지지력 산정식</label>
                        <select id="pile_qp_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                    </div>
                    <div class="input-group" style="margin:0;">
                        <label>콘크리트 강도 f'_c (MPa)</label>
                        <input type="number" id="pile_fck" value="${initialFck}" step="0.1" style="width:100%; height:32px; box-sizing:border-box; padding:4px; text-align:center;">
                    </div>
                    <div class="input-group" style="margin:0;">
                        <label>Joint 상태</label>
                        <select id="pile_joint_state" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.85em;">
                            <option value="closed" ${initialJointState === 'closed' ? 'selected' : ''}>Closed Joints (닫힌 절리)</option>
                            <option value="open" ${initialJointState === 'open' ? 'selected' : ''}>Open Joints (열린 절리)</option>
                        </select>
                    </div>
                    <div class="input-group" style="margin:0;">
                        <label>RQD (%)</label>
                        <input type="number" id="pile_rqd" value="${initialRqd}" step="0.1" style="width:100%; height:32px; box-sizing:border-box; padding:4px; text-align:center;">
                    </div>
                    ${rebarBoxHtml}
                `;
            } else {
                row2Container.innerHTML = `
                    <div class="input-group" style="margin:0;">
                        <label>선단지지력 산정식</label>
                        <select id="pile_qp_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                    </div>
                    <div class="input-group" style="margin:0;">
                        <label>주면마찰력 산정식</label>
                        <select id="pile_qs_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                    </div>
                    <div class="input-group" style="margin:0;">
                        <label>콘크리트 강도 f'_c (MPa)</label>
                        <input type="number" id="pile_fck" value="${initialFck}" step="0.1" style="width:100%; height:32px; box-sizing:border-box; padding:4px; text-align:center;">
                    </div>
                    <div class="input-group" style="margin:0;">
                        <label>시공 공법</label>
                        <select id="pile_method" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.88em;" disabled>
                            <option value="bored" selected>매입말뚝공법 (현장타설)</option>
                        </select>
                    </div>
                    ${rebarBoxHtml}
                `;
            }
        } else {
            grid2Label.textContent = '세부 구분';
            grid2Content.innerHTML = `<span style="color:#aaa; font-size:0.85em; width:100%; text-align:center;">- (없음) -</span>`;
            grid5Label.innerHTML = '허용압축응력 &sigma;<sub>ca</sub> (MPa)';
            specSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            grid5Val.value = '80.0';

            row2Container.innerHTML = `
                <div class="input-group" style="margin:0;">
                    <label>선단지지력 산정식</label>
                    <select id="pile_qp_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>주면마찰력 산정식</label>
                    <select id="pile_qs_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em;"></select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>시공 공법</label>
                    <select id="pile_method" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.88em;">
                        <option value="driven">항타공법</option>
                        <option value="bored" selected>매입말뚝공법</option>
                    </select>
                </div>
                <div class="input-group" style="margin:0;">
                    <label>이음 방법 및 개소</label>
                    <div style="display:flex; gap:4px; height: 32px; align-items:center;">
                        <select id="pile_joint_type" style="flex:1; height:100%; box-sizing:border-box; padding:2px; font-size:0.85em;">
                            <option value="weld">용접 이음</option>
                            <option value="bolt">볼트 이음</option>
                            <option value="none">이음 없음</option>
                        </select>
                        <input type="number" id="pile_joint_count" value="0" min="0" style="width:40px; height:100%; text-align:center; box-sizing:border-box; padding:2px; font-size:0.85em;">
                        <span style="font-size:0.82em; font-weight:bold; color:#2c3e50; white-space:nowrap;">개소</span>
                    </div>
                </div>
            `;
        }

        applySpecSelection();
        updateMethodFormulas();
    }

    function applySpecSelection() {
        const type = container.querySelector('#pile_type').value;
        const specVal = container.querySelector('#pile_spec_select').value;
        const dInput = container.querySelector('#pile_D');
        const tInput = container.querySelector('#pile_t');
        const tSelect = container.querySelector('#pile_t_select');
        const grid5Val = container.querySelector('#grid5_val');

        if (!tSelect) return;
        tSelect.innerHTML = '';

        if (type === 'CAST' || type === 'CAST_ROCK') {
            tSelect.innerHTML = `<option value="none">- (없음) -</option>`;
            tSelect.disabled = true;
            if (tInput) {
                tInput.value = '0';
                tInput.readOnly = true;
                tInput.style.backgroundColor = '#f2f2f2';
            }
            if (dInput) dInput.readOnly = false;
            return;
        }

        tSelect.disabled = false;
        if (tInput) tInput.style.backgroundColor = '#fff';

        if (specVal === 'direct') {
            if (dInput) dInput.readOnly = false;
            tSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            if (tInput) tInput.readOnly = false;
            return;
        }

        if (type === 'PHC') {
            const data = PHC_DB[specVal];
            if (data) {
                if (dInput) {
                    dInput.value = Math.round(parseFloat(specVal));
                    dInput.readOnly = true;
                }
                tSelect.innerHTML = `<option value="direct">직접 입력</option><option value="${data.t}">${data.t}mm</option>`;
                tSelect.value = data.t.toString();
                if (tInput) {
                    tInput.value = data.t;
                    tInput.readOnly = true;
                }
                const phcClass = container.querySelector('#phc_class')?.value || 'A';
                if (grid5Val) grid5Val.value = data[phcClass] || 1730;
            }
        } else if (type === 'STEEL') {
            const data = STEEL_DB[specVal];
            if (data) {
                if (dInput) {
                    dInput.value = parseFloat(specVal).toFixed(1);
                    dInput.readOnly = true;
                }
                tSelect.innerHTML = `<option value="direct">직접 입력</option>`;
                data.tList.forEach(t => { tSelect.innerHTML += `<option value="${t}">${t}mm</option>`; });
                let defaultT = data.tList.includes(12) ? 12 : data.tList[0];
                tSelect.value = defaultT.toString();
                if (tInput) {
                    tInput.value = defaultT;
                    tInput.readOnly = true;
                }
                const gradeKey = container.querySelector('#steel_grade')?.value || 'STP275';
                if (grid5Val) grid5Val.value = STEEL_GRADE_MAP[gradeKey] || 275000;
            }
        } else {
            if (dInput) dInput.readOnly = false;
            tSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            if (tInput) tInput.readOnly = false;
        }
    }

    function applyThicknessSelection() {
        const type = container.querySelector('#pile_type').value;
        if (type === 'CAST' || type === 'CAST_ROCK') return;

        const tSelect = container.querySelector('#pile_t_select');
        const tInput = container.querySelector('#pile_t');
        if (!tSelect || !tInput) return;

        if (tSelect.value === 'direct') {
            tInput.readOnly = false;
        } else {
            tInput.value = tSelect.value;
            tInput.readOnly = true;
        }
    }

    // 이벤트 리스너 바인딩
    container.addEventListener('click', (e) => {
        if (e.target.id === 'pile_layer_add') {
            const currentPileType = container.querySelector('#pile_type')?.value || 'PHC';
            const defaultType = currentPileType === 'CAST' ? 'sand' : 'sand';
            const nextIdx = pileLayers.length + 1;
            pileLayers.push({ name: `지층${nextIdx}`, type: defaultType, dz: 3.0, n_val: 30, gamma: 19.0, c_val: 0 });
            try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
            renderLayers();
        } else if (e.target.classList.contains('pl-del')) {
            pileLayers.splice(e.target.dataset.idx, 1);
            try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
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
            try { localStorage.setItem('geo_pile_type', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_method') {
            updateMethodFormulas();
            try { localStorage.setItem('geo_pile_method', e.target.value); } catch(err){}
        } else if (e.target.id === 'phc_class' || e.target.id === 'pile_spec_select') {
            applySpecSelection();
        } else if (e.target.id === 'pile_t_select') {
            applyThicknessSelection();
        } else if (e.target.id === 'steel_grade') {
            const gradeKey = e.target.value;
            const grid5 = container.querySelector('#grid5_val');
            if (grid5) grid5.value = STEEL_GRADE_MAP[gradeKey] || 275000;
        } else if (e.target.id === 'pile_qp_formula') {
            try { localStorage.setItem('geo_pile_qp_formula', e.target.value); } catch(err){}
            updateFormulaInfoText();
        } else if (e.target.id === 'pile_qs_formula') {
            try { localStorage.setItem('geo_pile_qs_formula', e.target.value); } catch(err){}
            updateFormulaInfoText();
        } else if (e.target.id === 'pile_gwt') {
            try { localStorage.setItem('geo_pile_gwt', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_rmr') {
            try { localStorage.setItem('geo_pile_rmr', e.target.value); } catch(err){}
        } else if (e.target.id === 'grid5_val') {
            try { localStorage.setItem('geo_pile_grid5_val', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_fck') {
            try { localStorage.setItem('geo_pile_fck', e.target.value); } catch(err){}
            updateUIState();
        } else if (e.target.id === 'pile_head_fix') {
            try { localStorage.setItem('geo_pile_head_fix', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_E0') {
            try { localStorage.setItem('geo_pile_E0', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_allow_lat_disp') {
            try { localStorage.setItem('geo_pile_allow_lat_disp', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_H_norm') {
            try { localStorage.setItem('geo_pile_H_norm', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_H_seis') {
            try { localStorage.setItem('geo_pile_H_seis', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_M_norm') {
            try { localStorage.setItem('geo_pile_M_norm', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_M_seis') {
            try { localStorage.setItem('geo_pile_M_seis', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_Ep') {
            try { localStorage.setItem('geo_pile_Ep', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_alpha_s') {
            try { localStorage.setItem('geo_pile_alpha_s', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_Cp_type') {
            const customInput = container.querySelector('#pile_Cp_custom');
            if (customInput) customInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
            try { localStorage.setItem('geo_pile_Cp_type', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_Cp_custom') {
            try { localStorage.setItem('geo_pile_Cp_custom', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_allow_settle') {
            try { localStorage.setItem('geo_pile_allow_settle', e.target.value); } catch(err){}
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
        try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
    });

    updateUIState();

    function updatePileLength() {
        const totalL = calcTotalL();
        const pileLVal = container.querySelector('#pile_L_val');
        if (pileLVal) {
            pileLVal.textContent = totalL.toFixed(2);
            try { localStorage.setItem('geo_pile_L', totalL.toFixed(2)); } catch(err){}
        }
    }

    function renderLayers() {
        const tbody = container.querySelector('#pile_layers_body');
        if (!tbody) return;

        const currentPileType = container.querySelector('#pile_type')?.value || 'PHC';

        tbody.innerHTML = '';
        pileLayers.forEach((l, idx) => {
            if (currentPileType === 'CAST' && l.type === 'rock') {
                l.type = 'weathered_rock';
            }

            const gammaVal = l.gamma !== undefined ? l.gamma : 19.0;
            const rockOptionHtml = currentPileType === 'CAST' ? '' : `<option value="rock" ${l.type === 'rock' ? 'selected' : ''}>기반암(연암/경암)</option>`;

            tbody.innerHTML += `
                <tr>
                    <td style="padding:4px;"><input type="text" value="${l.name}" data-idx="${idx}" class="pl-name" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;">
                        <select data-idx="${idx}" class="pl-type" style="width:100%; box-sizing:border-box; padding:4px; font-size:0.9em;">
                            <option value="sand" ${l.type === 'sand' ? 'selected' : ''}>사질토</option>
                            <option value="clay" ${l.type === 'clay' ? 'selected' : ''}>점성토</option>
                            <option value="gravel" ${l.type === 'gravel' ? 'selected' : ''}>자갈층</option>
                            <option value="weathered_rock" ${l.type === 'weathered_rock' ? 'selected' : ''}>풍화암</option>
                            ${rockOptionHtml}
                        </select>
                    </td>
                    <td style="padding:4px;"><input type="number" value="${l.dz.toFixed(2)}" data-idx="${idx}" class="pl-dz" step="0.1" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${l.n_val}" data-idx="${idx}" class="pl-n" step="1" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${parseFloat(gammaVal).toFixed(1)}" data-idx="${idx}" class="pl-gamma" step="0.5" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${parseFloat(l.c_val).toFixed(1)}" data-idx="${idx}" class="pl-c" step="0.1" title="점성토: 점착력 c / 기반암: 일축압축강도 q_u" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><button type="button" class="pl-del" data-idx="${idx}" style="padding:3px 8px; background:#e74c3c; color:#fff; border:none; border-radius:3px; cursor:pointer;">-</button></td>
                </tr>
            `;
        });
        updatePileLength();
    }
    renderLayers();

    // Hoek & Brown (1988) 표 1
    const HB_TABLE_DATA = [
        { rmr: 3,   m: { 7: 0.007, 10: 0.010, 15: 0.015, 17: 0.017, 25: 0.025 }, s: 1.0e-7, label: "매우 불량한 암반 (3~23)" },
        { rmr: 23,  m: { 7: 0.029, 10: 0.041, 15: 0.061, 17: 0.069, 25: 0.102 }, s: 3.0e-6, label: "불량한 암반 (23~44)" },
        { rmr: 44,  m: { 7: 0.128, 10: 0.183, 15: 0.275, 17: 0.311, 25: 0.458 }, s: 9.0e-5, label: "보통의 암반 (44~65)" },
        { rmr: 65,  m: { 7: 0.575, 10: 0.821, 15: 1.231, 17: 1.395, 25: 2.052 }, s: 0.0029, label: "양호한 암반 (65~85)" },
        { rmr: 85,  m: { 7: 2.400, 10: 3.430, 15: 5.140, 17: 5.820, 25: 8.567 }, s: 0.082,  label: "매우 양호한 암반 (85~100)" },
        { rmr: 100, m: { 7: 7.000, 10: 10.000, 15: 15.000, 17: 17.000, 25: 25.000 }, s: 1.00,   label: "신선암 시료 (100)" }
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

    // ---------------------------------------------------------
    // 연직/수평 지지력 및 변위/침하량 종합 산정 핵심 함수
    // ---------------------------------------------------------
    function calculatePileCapacity() {
        const p_type = container.querySelector('#pile_type').value;
        const isPrecast = (p_type === 'PHC' || p_type === 'STEEL' || p_type === 'PC' || p_type === 'RC'); 
        let pileLayersData = pileLayers;

        if (p_type === 'CAST_ROCK') {
            const lastLayerCheck = pileLayersData.length > 0 ? pileLayersData[pileLayersData.length - 1] : null;
            if (!lastLayerCheck || lastLayerCheck.type !== 'rock') {
                alert("⚠️ 현장타설말뚝(기반암)이 선택되었습니다.\n최하단 지층의 토성 구분을 '기반암(연암/경암)'으로 설정해 주세요.");
                return;
            }
        }

        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qp_formula_key = container.querySelector('#pile_qp_formula').value;
        const qs_formula_key = container.querySelector('#pile_qs_formula')?.value || 'oneill';

        const qpSelectElem = container.querySelector('#pile_qp_formula');
        const qp_formula_name = qpSelectElem ? qpSelectElem.options[qpSelectElem.selectedIndex]?.text : '';

        const qsSelectElem = container.querySelector('#pile_qs_formula');
        const qs_formula_name = qsSelectElem ? qsSelectElem.options[qsSelectElem.selectedIndex]?.text : '';

        const D_mm = parseFloat(container.querySelector('#pile_D').value) || 500;
        const D = D_mm / 1000.0;
        const t_mm = (p_type === 'CAST' || p_type === 'CAST_ROCK') ? 0 : parseFloat(container.querySelector('#pile_t').value);
        const grid5Val = parseFloat(container.querySelector('#grid5_val').value) || 0;
        const gwt = parseFloat(container.querySelector('#pile_gwt')?.value) || 2.0;

        let t1_mm = 0;
        if (p_type === 'STEEL') {
            const t1Elem = container.querySelector('#pile_t1');
            if (t1Elem) t1_mm = parseFloat(t1Elem.value) || 0;
        }

        let user_fck = 27.0, user_joint_state = 'closed', user_rqd = 4.0;
        let em_ei_val = 0.01, alpha_e_val = 0.370;
        let user_rebar_d_mm = 25.40, user_rebar_fy_MPa = 400, user_rebar_count = 20;

        if (p_type === 'CAST' || p_type === 'CAST_ROCK') {
            user_fck = parseFloat(container.querySelector('#pile_fck')?.value) || 27.0;
            user_rebar_d_mm = parseFloat(container.querySelector('#pile_rebar_d')?.value) || 25.40;
            user_rebar_fy_MPa = parseFloat(container.querySelector('#pile_rebar_fy')?.value) || 400;
            user_rebar_count = parseInt(container.querySelector('#pile_rebar_count')?.value) || 0;

            if (p_type === 'CAST_ROCK') {
                user_joint_state = container.querySelector('#pile_joint_state')?.value || 'closed';
                user_rqd = parseFloat(container.querySelector('#pile_rqd')?.value) || 4.0;
                em_ei_val = interpolateEmEi(user_rqd, user_joint_state);
                alpha_e_val = interpolateAlphaE(em_ei_val);
            }
        }

        const L = pileLayersData.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);
        const joint_type = container.querySelector('#pile_joint_type')?.value || 'none';
        const joint_cnt = parseInt(container.querySelector('#pile_joint_count')?.value) || 0;

        const P_norm = parseFloat(container.querySelector('#pile_P_norm').value) || 0;
        const P_seis = parseFloat(container.querySelector('#pile_P_seis').value) || 0;
        const H_norm = parseFloat(container.querySelector('#pile_H_norm').value) || 0;
        const H_seis = parseFloat(container.querySelector('#pile_H_seis').value) || 0;
        const M_norm = parseFloat(container.querySelector('#pile_M_norm').value) || 0;
        const M_seis = parseFloat(container.querySelector('#pile_M_seis').value) || 0;

        // ==========================================
        // 1. 연직 선단지지력 (Qup)
        // ==========================================
        let lastLayer = pileLayersData.length > 0 ? pileLayersData[pileLayersData.length - 1] : { name: '지지층', type: 'sand', n_val: 50, gamma: 20.0, c_val: 0 };
        let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
        let c_tip = parseFloat(lastLayer.c_val) || 0;
        const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
        
        let q_p = 0; 
        let qp_calc_detail = "";
        let hbRes = null, hb_m = 0, hb_s = 0, hb_mi = 17, input_rmr = 30;

        if (p_type === 'CAST_ROCK') {
            if (qp_formula_key === 'rock_case1') {
                q_p = 2.5 * c_tip;
                qp_calc_detail = `• 공식: q<sub>p</sub> = 2.5 &times; q<sub>u</sub><br>` +
                                 `• 계산: q<sub>p</sub> = 2.5 &times; ${c_tip}<br>` +
                                 `• 결과: q<sub>p</sub> = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            } else {
                hb_mi = parseInt(container.querySelector('#pile_rock_type')?.value) || 17;
                input_rmr = parseFloat(container.querySelector('#pile_rmr')?.value) || 30;
                hbRes = interpolateHoekBrown(input_rmr, hb_mi);
                hb_m = hbRes.m; hb_s = hbRes.s;
                let factor = Math.sqrt(hb_s) + Math.sqrt(hb_m * Math.sqrt(hb_s) + hb_s);
                q_p = factor * c_tip;
                qp_calc_detail = `• 공식: q<sub>p</sub> = [&radic;s + &radic;(m&radic;s + s)] &times; q<sub>u</sub><br>` +
                                 `• 계산: [&radic;${hb_s.toExponential(3)} + &radic;(${hb_m.toFixed(4)}&times;&radic;${hb_s.toExponential(3)} + ${hb_s.toExponential(3)})] &times; ${c_tip} = ${factor.toFixed(4)} &times; ${c_tip}<br>` +
                                 `• 결과: q<sub>p</sub> = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            }
        } else if (p_type === 'CAST') {
            q_p = raw_N_tip <= 75 ? 57.4 * raw_N_tip : 4309.2;
            qp_calc_detail = `• 공식: q<sub>p</sub> = ${raw_N_tip <= 75 ? '57.4 &times; N' : '4309.2 (N>75 한계)'}<br>` +
                             `• 계산: ${raw_N_tip <= 75 ? `57.4 &times; ${raw_N_tip}` : '4309.2'}<br>` +
                             `• 결과: q<sub>p</sub> = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
        } else if (method === 'driven') {
            let N_used = Math.min(raw_N_tip, 60);
            q_p = 300.0 * N_used;
            qp_calc_detail = `• 공식: q<sub>p</sub> = 300 &times; N (N&le;60)<br>` +
                             `• 계산: 300 &times; ${N_used}<br>` +
                             `• 결과: q<sub>p</sub> = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
        } else {
            if (qp_formula_key === 'lh') {
                let N_used = Math.min(raw_N_tip, 60);
                q_p = 250.0 * N_used;
                qp_calc_detail = `• 공식: q<sub>p</sub> = 250 &times; N (N&le;60)<br>` +
                                 `• 계산: 250 &times; ${N_used}<br>` +
                                 `• 결과: q<sub>p</sub> = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            } else {
                let isGranular = ['sand', 'gravel', 'weathered_rock', 'rock'].includes(lastLayer.type);
                if (isGranular) {
                    let calc_val = 200.0 * raw_N_tip;
                    q_p = Math.min(calc_val, 12000.0);
                    qp_calc_detail = `• 공식: q<sub>p</sub> = min(200 &times; N, 12,000)<br>` +
                                     `• 계산: min(200 &times; ${raw_N_tip}, 12,000) = min(${calc_val.toFixed(1)}, 12,000)<br>` +
                                     `• 결과: q<sub>p</sub> = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
                } else {
                    let calc_val = 6.0 * c_tip;
                    q_p = Math.min(calc_val, 12000.0);
                    qp_calc_detail = `• 공식: q<sub>p</sub> = min(6 &times; c<sub>u</sub>, 12,000)<br>` +
                                     `• 계산: min(6 &times; ${c_tip}, 12,000) = min(${calc_val.toFixed(1)}, 12,000)<br>` +
                                     `• 결과: q<sub>p</sub> = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
                }
            }
        }

        const Qup = q_p * Ap;

        // ==========================================
        // 2. 연직 주면마찰력 (Qus)
        // ==========================================
        const As = Math.PI * D;
        let total_Qus = 0;
        let layer_calc_rows = [];

        let soilLayers = pileLayersData.filter(l => l.type !== 'rock');
        let sum_N_dz = 0, sum_dz = 0;
        soilLayers.forEach(l => {
            let nval = parseFloat(l.n_val) || 0;
            let dz = parseFloat(l.dz) || 0;
            sum_N_dz += nval * dz; sum_dz += dz;
        });
        const N_60 = sum_dz > 0 ? (sum_N_dz / sum_dz) : 0;

        let cum_depth = 0;
        let cum_sigma_v = 0; 
        let c_factor = (method === 'driven') ? 2.0 : (qs_formula_key === 'lh' ? 2.0 : 2.5);
        let c_factor_c = (method === 'driven') ? 1.0 : (qs_formula_key === 'lh' ? 5.0 : 0.8);
        const typeMap = { 'sand': '사질토', 'clay': '점성토', 'gravel': '자갈층', 'weathered_rock': '풍화암', 'rock': '기반암' };

        pileLayersData.forEach(l => {
            let f_unit = 0;
            let formula_str = "";
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
                let f_unit_MPa = Math.min(fs_MPa, fs_limit_MPa);
                f_unit = f_unit_MPa * 1000.0; 
                formula_str = `• 공식: min(0.65 &times; &alpha;<sub>E</sub> &times; P<sub>a</sub>(q<sub>u</sub>/P<sub>a</sub>)<sup>0.5</sup>, 7.8 &times; P<sub>a</sub>(f'<sub>c</sub>/P<sub>a</sub>)<sup>0.5</sup>)<br>` +
                              `• 계산: min(${(fs_MPa*1000).toFixed(1)}, ${(fs_limit_MPa*1000).toFixed(1)})<br>` +
                              `• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
            } else if ((p_type === 'CAST' || p_type === 'CAST_ROCK') && qs_formula_key === 'oneill') {
                if (l.type === 'sand' || l.type === 'weathered_rock') {
                    let z_mm = z_mid * 1000.0;
                    let beta_calc = 1.5 - (7.7e-3 * Math.sqrt(z_mm));
                    let beta = N_60 > 15 ? beta_calc : (N_60 / 15.0) * beta_calc;
                    let beta_clamped = Math.max(0.25, Math.min(1.20, beta));
                    let calc_val = beta_clamped * sigma_v_prime;
                    f_unit = Math.min(190.0, calc_val);
                    formula_str = `• 공식: min(190, &beta; &times; &sigma;'<sub>v</sub>)<br>` +
                                  `• 계산: min(190, ${beta_clamped.toFixed(3)} &times; ${sigma_v_prime.toFixed(1)}) = min(190, ${calc_val.toFixed(1)})<br>` +
                                  `• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                } else if (l.type === 'gravel') {
                    let z_mm = z_mid * 1000.0;
                    let beta = 2.0 - 0.00082 * Math.pow(z_mm, 0.75);
                    let beta_clamped = Math.max(0.25, Math.min(1.20, beta));
                    let calc_val = beta_clamped * sigma_v_prime;
                    f_unit = Math.min(190.0, calc_val);
                    formula_str = `• 공식: min(190, &beta; &times; &sigma;'<sub>v</sub>)<br>` +
                                  `• 계산: min(190, ${beta_clamped.toFixed(3)} &times; ${sigma_v_prime.toFixed(1)}) = min(190, ${calc_val.toFixed(1)})<br>` +
                                  `• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                } else {
                    let calc_val = 0.55 * c_val_i;
                    f_unit = Math.min(190.0, calc_val);
                    formula_str = `• 공식: min(190, 0.55 &times; c<sub>u</sub>)<br>` +
                                  `• 계산: min(190, 0.55 &times; ${c_val_i}) = min(190, ${calc_val.toFixed(1)})<br>` +
                                  `• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                }
            } else {
                let isGranular = ['sand', 'gravel', 'weathered_rock', 'rock'].includes(l.type);
                if (isGranular) {
                    let calc_val = c_factor * l.n_val;
                    f_unit = Math.min(100.0, calc_val);
                    formula_str = `• 공식: min(100, ${c_factor} &times; N)<br>` +
                                  `• 계산: min(100, ${c_factor} &times; ${l.n_val}) = min(100, ${calc_val.toFixed(1)})<br>` +
                                  `• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                } else {
                    let calc_val = c_factor_c * c_val_i;
                    f_unit = Math.min(100.0, calc_val);
                    formula_str = `• 공식: min(100, ${c_factor_c} &times; c<sub>u</sub>)<br>` +
                                  `• 계산: min(100, ${c_factor_c} &times; ${c_val_i}) = min(100, ${calc_val.toFixed(1)})<br>` +
                                  `• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
                }
            }

            let fxL = f_unit * dz_i;
            let Qus_i = fxL * As;
            total_Qus += Qus_i;

            layer_calc_rows.push({
                name: l.name, type: typeMap[l.type] || l.type,
                dz: dz_i, n_val: l.n_val, gamma: gamma_i, c_val: c_val_i,
                z_mid: z_mid, sigma_v_prime: sigma_v_prime,
                formula: formula_str, fxL: fxL, qusi: Qus_i
            });

            cum_depth += dz_i;
            cum_sigma_v += gamma_i * dz_i;
        });

        // ==========================================
        // 3. 지반 연직 극한/허용지지력 및 재료 내하력
        // ==========================================
        const Qu_total = Qup + total_Qus;
        const Qa_soil_norm = Qu_total / 3.0;
        const Qa_soil_seis = Qu_total / 2.0;

        let Q_mat_base = 0;
        let qMatBaseDetailStr = "";
        let A_net = 0;
        let Ip = 0; // 단면 2차 모멘트 (m^4)

        if (p_type === 'CAST' || p_type === 'CAST_ROCK') {
            const Ac_gross = Ap; 
            const db_m = user_rebar_d_mm / 1000.0;
            const Ab_single = (Math.PI * Math.pow(db_m, 2)) / 4.0; 
            const Ast = user_rebar_count * Ab_single; 
            const Ac_net = Math.max(0, Ac_gross - Ast); 
            A_net = Ac_gross;
            Ip = (Math.PI * Math.pow(D, 4)) / 64.0;
            const fca_kNm2 = Math.min(0.25 * user_fck, 8.5) * 1000.0; 
            const fsa_rebar_kNm2 = 0.40 * user_rebar_fy_MPa * 1000.0; 
            Q_mat_base = (fca_kNm2 * Ac_net) + (fsa_rebar_kNm2 * Ast); 

            qMatBaseDetailStr = `
                • <strong>말뚝의 장기허용압축강도 (f<sub>sa</sub> A) 산정 :</strong><br>
                &nbsp;&nbsp;- 말뚝 단면적 (A): ${Ac_gross.toFixed(4)} m², 철근 단면적 (A<sub>st</sub>): ${Ast.toFixed(6)} m²<br>
                &nbsp;&nbsp;- 콘크리트 허용압축강도 (f<sub>ca</sub>): ${(fca_kNm2/1000).toFixed(1)} MPa, 철근 허용압축강도: ${(fsa_rebar_kNm2/1000).toFixed(1)} MPa<br>
                &nbsp;&nbsp;- 총 기본 허용압축하중 (Q<sub>mat_base</sub>) = <strong>${Q_mat_base.toFixed(1)} kN</strong>
            `;
        } else if (p_type === 'PHC') {
            let Din = Math.max(0, D - 2.0 * (t_mm / 1000.0));
            A_net = (Math.PI * (Math.pow(D, 2) - Math.pow(Din, 2))) / 4.0;
            Ip = (Math.PI * (Math.pow(D, 4) - Math.pow(Din, 4))) / 64.0;
            Q_mat_base = grid5Val;
            qMatBaseDetailStr = `
                • <strong>기본 허용압축하중 (Q<sub>mat_base</sub>) 산정 :</strong><br>
                &nbsp;&nbsp;- 적용 공식: 표준 PHC 말뚝 규격 DB 및 입력값 (P<sub>a</sub>) = <strong>${Q_mat_base.toFixed(1)} kN</strong>
            `;
        } else if (p_type === 'STEEL') {
            let D_out = D - (t1_mm / 1000.0);
            let D_in = Math.max(0, D_out - 2.0 * (t_mm / 1000.0));
            A_net = (Math.PI * (Math.pow(D_out, 2) - Math.pow(D_in, 2))) / 4.0;
            Ip = (Math.PI * (Math.pow(D_out, 4) - Math.pow(D_in, 4))) / 64.0;
            Q_mat_base = grid5Val * A_net;

            qMatBaseDetailStr = `
                • <strong>강관말뚝 순단면적 (A<sub>net</sub>) 및 내하력 산정 :</strong><br>
                &nbsp;&nbsp;- 순단면적 A<sub>net</sub> = ${A_net.toFixed(5)} m²<br>
                &nbsp;&nbsp;- 기본 허용압축하중 (Q<sub>mat_base</sub>) = &sigma;<sub>ca</sub> &times; A<sub>net</sub> = <strong>${Q_mat_base.toFixed(1)} kN</strong>
            `;
        } else {
            A_net = Ap;
            Ip = (Math.PI * Math.pow(D, 4)) / 64.0;
            Q_mat_base = grid5Val * 1000.0 * A_net;
            qMatBaseDetailStr = `• 기본 허용압축하중 (Q<sub>mat_base</sub>) = <strong>${Q_mat_base.toFixed(1)} kN</strong>`;
        }

        const L_over_D = L / D;
        let n_limit = p_type.includes('CAST') ? 60 : 85;
        let mu1 = Math.max(0, L_over_D - n_limit);
        let mu2 = (method === 'bored' || p_type.includes('CAST')) ? ((joint_type === 'weld' ? 5.0 : (joint_type === 'bolt' ? 10.0 : 0.0)) * 0.5 * joint_cnt) : ((joint_type === 'weld' ? 5.0 : (joint_type === 'bolt' ? 10.0 : 0.0)) * joint_cnt);
        const Qas = (1.0 - (mu1 + mu2) / 100.0) * Q_mat_base;

        const Q_app_norm = Math.min(Qa_soil_norm, Qas);
        const Q_app_seis = Math.min(Qa_soil_seis, Qas);

        // ==========================================
        // 4. 연직 침하량 산정 (기성말뚝 및 현장타설말뚝)
        // ==========================================
        let Cp_min = 0, Cp_max = 0, Cp_avg = 0;
        let soilLabel = "", methodLabel = (method === 'driven') ? "타입말뚝" : "굴착말뚝";
        let isClay = lastLayer.type === 'clay';

        if (isClay) {
            soilLabel = "점토 (굳은~연약)";
            if (method === 'driven') { Cp_min = 0.02; Cp_max = 0.03; }
            else { Cp_min = 0.03; Cp_max = 0.06; }
        } else {
            soilLabel = "모래 (조밀~느슨)";
            if (method === 'driven') { Cp_min = 0.02; Cp_max = 0.04; }
            else { Cp_min = 0.09; Cp_max = 0.18; }
        }
        Cp_avg = (Cp_min + Cp_max) / 2.0;

        let Ep = parseFloat(container.querySelector('#pile_Ep')?.value);
        if (!Ep || isNaN(Ep)) {
            if (p_type === 'STEEL') Ep = 200000000;
            else if (p_type === 'PHC') Ep = 39200000;
            else Ep = 8500 * Math.cbrt(user_fck + 4) * 1000.0;
        }

        let alpha_s = parseFloat(container.querySelector('#pile_alpha_s')?.value) || 0.67;
        let allow_settle = parseFloat(container.querySelector('#pile_allow_settle')?.value) || 25.0;

        let Cp = Cp_avg; 
        let cpSelectType = container.querySelector('#pile_Cp_type')?.value || 'avg';
        if (cpSelectType === 'min') Cp = Cp_min;
        else if (cpSelectType === 'max') Cp = Cp_max;
        else if (cpSelectType === 'custom') Cp = parseFloat(container.querySelector('#pile_Cp_custom')?.value) || 0.09;

        let Qpa_norm = Qu_total > 0 ? P_norm * (Qup / Qu_total) : 0; 
        let Qfs_norm = Qu_total > 0 ? P_norm * (total_Qus / Qu_total) : 0;
        let Qpa_seis = Qu_total > 0 ? P_seis * (Qup / Qu_total) : 0;
        let Qfs_seis = Qu_total > 0 ? P_seis * (total_Qus / Qu_total) : 0;

        // Vesic 침하량
        let Ss_norm_mm = (A_net > 0 && Ep > 0) ? (((Qpa_norm + alpha_s * Qfs_norm) * L) / (A_net * Ep) * 1000) : 0;
        let Sp_norm_mm = (D > 0 && q_p > 0) ? ((Cp * Qpa_norm) / (D * q_p) * 1000) : 0;
        let Cs = (0.93 + 0.16 * Math.sqrt(L / D)) * Cp;
        let Sps_norm_mm = (L > 0 && q_p > 0) ? ((Cs * Qfs_norm) / (L * q_p) * 1000) : 0;
        let S_vesic_norm = Ss_norm_mm + Sp_norm_mm + Sps_norm_mm;

        let Ss_seis_mm = (A_net > 0 && Ep > 0) ? (((Qpa_seis + alpha_s * Qfs_seis) * L) / (A_net * Ep) * 1000) : 0;
        let Sp_seis_mm = (D > 0 && q_p > 0) ? ((Cp * Qpa_seis) / (D * q_p) * 1000) : 0;
        let Sps_seis_mm = (L > 0 && q_p > 0) ? ((Cs * Qfs_seis) / (L * q_p) * 1000) : 0;
        let S_vesic_seis = Ss_seis_mm + Sp_seis_mm + Sps_seis_mm;

        // CFEM 침하량
        let term1_cfem_mm = (D / 100) * 1000;
        let term2_cfem_norm_mm = (A_net > 0 && Ep > 0) ? ((P_norm * L) / (A_net * Ep) * 1000) : 0;
        let S_cfem_norm = term1_cfem_mm + term2_cfem_norm_mm;

        let term2_cfem_seis_mm = (A_net > 0 && Ep > 0) ? ((P_seis * L) / (A_net * Ep) * 1000) : 0;
        let S_cfem_seis = term1_cfem_mm + term2_cfem_seis_mm;

        // ==========================================
        // 5. 수평 지지력 및 수평 변위 산정 (Chang 방법)
        // ==========================================
        let headFix = container.querySelector('#pile_head_fix')?.value || 'fixed';
        let allow_lat_disp = parseFloat(container.querySelector('#pile_allow_lat_disp')?.value) || 15.0;

        let user_E0 = parseFloat(container.querySelector('#pile_E0')?.value);
        if (!user_E0 || isNaN(user_E0)) {
            let topN = pileLayersData.length > 0 ? parseFloat(pileLayersData[0].n_val) || 10 : 10;
            user_E0 = 2800 * topN;
        }

        let kh0 = (1.0 / 0.3) * user_E0; // kN/m³
        let Bh = D; 
        let kh = kh0 * Math.pow(Bh / 0.3, -0.75); // kN/m³
        let EI = Ep * Ip; // 휨강성 (kN·m²)
        let beta = Math.pow((kh * D) / (4.0 * EI), 0.25); // m^-1

        // 수평변위 (mm) 산정 함수
        const calcLatDisp = (H_val, M_val) => {
            let disp_m = 0;
            if (headFix === 'fixed') {
                disp_m = Math.abs(H_val - beta * M_val) / (2.0 * EI * Math.pow(beta, 3));
            } else {
                disp_m = (H_val + beta * M_val) / (2.0 * EI * Math.pow(beta, 3));
            }
            return disp_m * 1000.0;
        };

        let delta_norm_mm = calcLatDisp(H_norm, M_norm);
        let delta_seis_mm = calcLatDisp(H_seis, M_seis);

        // 허용 수평변위 기준 수평지지력 H_a (kN)
        let Ha_norm = (H_norm > 0 && delta_norm_mm > 0) ? (H_norm * (allow_lat_disp / delta_norm_mm)) : 0;
        let Ha_seis = (H_seis > 0 && delta_seis_mm > 0) ? (H_seis * (allow_lat_disp / delta_seis_mm)) : 0;

        // ==========================================
        // 6. 최종 판정 및 결과 화면 출력
        // ==========================================
        const status_p_norm = P_norm <= Q_app_norm ? '안정 (O.K)' : 'NG';
        const status_p_seis = P_seis <= Q_app_seis ? '안정 (O.K)' : 'NG';
        const status_h_norm = delta_norm_mm <= allow_lat_disp ? '안정 (O.K)' : 'NG';
        const status_h_seis = delta_seis_mm <= allow_lat_disp ? '안정 (O.K)' : 'NG';
        const status_s_norm = S_vesic_norm <= allow_settle ? '안정 (O.K)' : 'NG';
        const status_s_seis = S_vesic_seis <= allow_settle ? '안정 (O.K)' : 'NG';

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
            <tr>
                <td rowspan="2" style="background:#e8f8f5; font-weight:bold;">수평지지력 & 변위<br><span style="font-size:0.8em; color:#16a085;">(Chang 방법)</span></td>
                <td>평상시 (상시)</td>
                <td style="font-weight:bold; color:#16a085;">H = ${H_norm.toFixed(1)} kN (&delta; = ${delta_norm_mm.toFixed(2)} mm)</td>
                <td>H<sub>a</sub> = ${Ha_norm.toFixed(1)} kN (&delta;<sub>a</sub> = ${allow_lat_disp.toFixed(1)} mm)</td>
                <td style="font-weight:bold; color:${delta_norm_mm <= allow_lat_disp ? '#27ae60' : '#c0392b'};">${status_h_norm}</td>
            </tr>
            <tr>
                <td>내진시 (지진시)</td>
                <td style="font-weight:bold; color:#16a085;">H = ${H_seis.toFixed(1)} kN (&delta; = ${delta_seis_mm.toFixed(2)} mm)</td>
                <td>H<sub>a</sub> = ${Ha_seis.toFixed(1)} kN (&delta;<sub>a</sub> = ${allow_lat_disp.toFixed(1)} mm)</td>
                <td style="font-weight:bold; color:${delta_seis_mm <= allow_lat_disp ? '#27ae60' : '#c0392b'};">${status_h_seis}</td>
            </tr>
            <tr>
                <td rowspan="2" style="background:#f5eef8; font-weight:bold;">연직침하량 검토<br><span style="font-size:0.8em; color:#8e44ad;">(Vesic 반경험식)</span></td>
                <td>평상시 (상시)</td>
                <td style="font-weight:bold; color:#8e44ad;">S<sub>vesic</sub> = ${S_vesic_norm.toFixed(2)} mm</td>
                <td rowspan="2" style="vertical-align:middle;">S<sub>a</sub> = ${allow_settle.toFixed(1)} mm</td>
                <td style="font-weight:bold; color:${S_vesic_norm <= allow_settle ? '#27ae60' : '#c0392b'};">${status_s_norm}</td>
            </tr>
            <tr>
                <td>내진시 (지진시)</td>
                <td style="font-weight:bold; color:#8e44ad;">S<sub>vesic</sub> = ${S_vesic_seis.toFixed(2)} mm</td>
                <td style="font-weight:bold; color:${S_vesic_seis <= allow_settle ? '#27ae60' : '#c0392b'};">${status_s_seis}</td>
            </tr>
        `;

        const resultDiv = container.querySelector('#pile-result');
        if (!resultDiv) return;
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div class="section-title">[말뚝기초 지지력, 침하량 및 수평변위 종합 검토 요약]</div>
            <div class="table-container">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th colspan="2">검토 항목</th>
                            <th>작용하중 / 발생변위</th>
                            <th>허용지지력 / 허용변위</th>
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
                • 지지층 : <strong>${lastLayer.name}</strong> (N = ${raw_N_tip}, c(q<sub>u</sub>) = ${c_tip} kPa)<br>
                • 선단면적 A<sub>p</sub> = ${Ap.toFixed(5)} m² / q<sub>p</sub> = ${q_p.toFixed(1)} kN/m²<br>
                • <strong>극한선단지지력 Q<sub>up</sub></strong> = q<sub>p</sub> &times; A<sub>p</sub> = <span style="font-weight:bold; color:#2980b9;">${Qup.toFixed(1)} kN</span>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                <strong>(2) 말뚝 주면마찰력 (Q<sub>us</sub>)</strong><br>
                • 적용 산정식 : <strong>${qs_formula_name}</strong><br>
                • <strong>총 극한주면마찰력 Q<sub>us</sub></strong> = <span style="font-weight:bold; color:#2980b9;">${total_Qus.toFixed(1)} kN</span>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px;">
                <strong>(3) 지반에 의한 극한 및 허용지지력 (Q<sub>u</sub>, Q<sub>a,soil</sub>)</strong><br>
                • 연직 극한지지력 Q<sub>u</sub> = Q<sub>up</sub> + Q<sub>us</sub> = <strong>${Qu_total.toFixed(1)} kN</strong><br>
                • 평상시 허용지지력 (F.S = 3.0) = <strong>${Qa_soil_norm.toFixed(1)} kN</strong> / 내진시 허용지지력 (F.S = 2.0) = <strong>${Qa_soil_seis.toFixed(1)} kN</strong>
            </div>

            <div class="section-title">[검증 2] 말뚝의 수평지지력 및 수평변위 산정 (Chang 방법)</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height: 1.6;">
                • <strong>단면 2차 모멘트 (I<sub>p</sub>) :</strong> ${Ip.toExponential(4)} m⁴ / <strong>휨강성 (E<sub>p</sub>I<sub>p</sub>) :</strong> ${EI.toLocaleString()} kN·m²<br>
                • <strong>지반 변형계수 (E<sub>0</sub>) :</strong> ${user_E0.toLocaleString()} kN/m² &rarr; <strong>수평 지반반력계수 (k<sub>h</sub>) :</strong> ${kh.toFixed(1)} kN/m³<br>
                • <strong>말뚝의 휨 특성치 (&beta;) :</strong> &radic;&radic;(k<sub>h</sub> D / 4E<sub>p</sub>I<sub>p</sub>) = <strong>${beta.toFixed(4)} m⁻¹</strong><br>
                • <strong>두부 구속조건 :</strong> ${headFix === 'fixed' ? '고정단 (Fixed Head)' : '자유단 (Free Head)'}<br>
                • <strong>수평변위 산정 결과 :</strong><br>
                &nbsp;&nbsp;- 평상시 수평변위 (&delta;<sub>norm</sub>) = <strong><span style="color:#16a085;">${delta_norm_mm.toFixed(2)} mm</span></strong> (허용변위: ${allow_lat_disp.toFixed(1)} mm &rarr; ${status_h_norm})<br>
                &nbsp;&nbsp;- 내진시 수평변위 (&delta;<sub>seis</sub>) = <strong><span style="color:#16a085;">${delta_seis_mm.toFixed(2)} mm</span></strong> (허용변위: ${allow_lat_disp.toFixed(1)} mm &rarr; ${status_h_seis})
            </div>

            <div class="section-title">[검증 3] 말뚝 연직침하량 산정 상세 (Vesic 및 CFEM)</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                • <strong>경험계수 C<sub>p</sub> :</strong> ${Cp.toFixed(3)} (선단 지지층: ${soilLabel}, ${methodLabel})<br>
                • <strong>평상시 연직 침하량 (P = ${P_norm.toFixed(1)} kN) :</strong><br>
                &nbsp;&nbsp;- Vesic 반경험식 침하량 (S<sub>vesic</sub>) = S<sub>s</sub>(${Ss_norm_mm.toFixed(2)}) + S<sub>p</sub>(${Sp_norm_mm.toFixed(2)}) + S<sub>ps</sub>(${Sps_norm_mm.toFixed(2)}) = <strong><span style="color:#8e44ad;">${S_vesic_norm.toFixed(2)} mm</span></strong><br>
                &nbsp;&nbsp;- CFEM 경험식 침하량 (S<sub>cfem</sub>) = <strong><span style="color:#8e44ad;">${S_cfem_norm.toFixed(2)} mm</span></strong><br>
                • <strong>내진시 연직 침하량 (P = ${P_seis.toFixed(1)} kN) :</strong><br>
                &nbsp;&nbsp;- Vesic 반경험식 침하량 (S<sub>vesic</sub>) = <strong><span style="color:#8e44ad;">${S_vesic_seis.toFixed(2)} mm</span></strong><br>
                &nbsp;&nbsp;- CFEM 경험식 침하량 (S<sub>cfem</sub>) = <strong><span style="color:#8e44ad;">${S_cfem_seis.toFixed(2)} mm</span></strong>
            </div>
        `;
    }
}
