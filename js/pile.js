export function initPileModule(container) {
    const getVal = (id, defaultVal) => {
        try {
            return localStorage.getItem('geo_pile_' + id) ?? defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

    const frac = (num, den) => `<span style="display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; margin:0 4px;"><span style="border-bottom:1px solid #2c3e50; padding:1px 4px;">${num}</span><span style="padding:1px 4px;">${den}</span></span>`;

    // 표준 제원 DB
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

    let savedD = parseFloat(getVal('D', '3000'));
    if (savedD < 10) savedD = savedD * 1000;

    let pileLayers;
    try {
        pileLayers = JSON.parse(localStorage.getItem('geo_pile_layers'));
        if (pileLayers && pileLayers.length > 0) {
            pileLayers.forEach(l => {
                if(l.phi === undefined) l.phi = 30;
                if(l.es === undefined) l.es = 50000;
                if(l.qu_val === undefined) l.qu_val = l.type === 'rock' ? (l.c_val || 30000) : 0;
            });
        }
    } catch (e) {
        pileLayers = null;
    }

    if (!pileLayers || !Array.isArray(pileLayers) || pileLayers.length === 0) {
        pileLayers = [
            { name: '매립사질', type: 'sand', dz: 2.10, n_val: 6, gamma: 18.5, c_val: 5.0, phi: 25, es: 7000, qu_val: 0 },
            { name: '점토', type: 'clay', dz: 1.60, n_val: 11, gamma: 18.0, c_val: 35.0, phi: 0, es: 12000, qu_val: 0 },
            { name: '풍화토1', type: 'weathered_rock', dz: 1.30, n_val: 11, gamma: 19.0, c_val: 15.0, phi: 28, es: 20000, qu_val: 0 },
            { name: '풍화토2', type: 'weathered_rock', dz: 1.00, n_val: 37, gamma: 19.5, c_val: 20.0, phi: 29, es: 55000, qu_val: 0 },
            { name: '풍화토3', type: 'weathered_rock', dz: 5.60, n_val: 50, gamma: 20.0, c_val: 25.0, phi: 30, es: 70000, qu_val: 0 },
            { name: '풍화암', type: 'weathered_rock', dz: 13.40, n_val: 50, gamma: 21.0, c_val: 32.0, phi: 33, es: 220000, qu_val: 0 },
            { name: '연암', type: 'rock', dz: 6.00, n_val: 50, gamma: 23.0, c_val: 0, phi: 33, es: 1300000, qu_val: 30000 }
        ];
        try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch (e) {}
    }

    const calcTotalL = () => pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

    const initialType = getVal('type', 'CAST_ROCK');
    const initialT1 = parseFloat(getVal('t1', '1.0')).toFixed(1);
    const initialMethod = getVal('method', 'bored');
    const initialGWT = parseFloat(getVal('gwt', '3.1')).toFixed(1);
    const defaultEp = initialType === 'STEEL' ? '200000000' : '26700000';

    container.innerHTML = `
        <style>
            .pl-input::-webkit-outer-spin-button,
            .pl-input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            .pl-input {
                -moz-appearance: textfield;
                width: 100%; box-sizing: border-box; padding: 4px; text-align: center;
                border: 1px solid #ccc; border-radius: 3px; font-size: 0.9em;
            }
            .pl-input:focus { border-color: #2980b9; outline: none; }
        </style>

        <h3>1. 설계자료 입력 (말뚝기초 지지력, 수평력 및 침하량 검토)</h3>
        
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 말뚝기초 제원 및 시공 조건</div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px;">
            <div class="input-group" style="margin:0;">
                <label>말뚝 종류</label>
                <select id="pile_type" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.88em;">
                    <option value="PHC" ${initialType === 'PHC' ? 'selected' : ''}>PHC 말뚝</option>
                    <option value="STEEL" ${initialType === 'STEEL' ? 'selected' : ''}>강관 말뚝</option>
                    <option value="CAST" ${initialType === 'CAST' ? 'selected' : ''}>현장타설말뚝(토사)</option>
                    <option value="CAST_ROCK" ${initialType === 'CAST_ROCK' ? 'selected' : ''}>현장타설말뚝(기반암)</option>
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
                    <input type="number" id="pile_D" value="${savedD}" step="0.1" placeholder="D(mm)" class="pl-input" style="width:45%; height:100%;">
                </div>
            </div>
            <div class="input-group" style="margin:0;">
                <label>두께 선택 / 두께 t (mm)</label>
                <div style="display:flex; gap:4px; height:32px;">
                    <select id="pile_t_select" style="width:55%; height:100%; box-sizing:border-box; padding:2px; font-size:0.85em;"></select>
                    <input type="number" id="pile_t" value="${getVal('t', '80')}" step="1" class="pl-input" style="width:45%; height:100%;">
                </div>
            </div>
            <div class="input-group" style="margin:0;">
                <label id="grid5_label" style="font-size: 0.78em; letter-spacing: -0.6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">허용축하중 P<sub>a</sub> (kN)</label>
                <input type="number" id="grid5_val" value="${getVal('grid5_val', '1730')}" step="0.1" class="pl-input" style="height:32px; font-weight:bold;">
            </div>
        </div>

        <div id="pile_row2_container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px;"></div>
        <div id="formula_info_box" style="margin-bottom: 15px; font-size: 0.83em; color: #2c3e50; background: #f4f6f7; padding: 8px 12px; border-radius: 4px; border-left: 4px solid #16a085;"></div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400; font-size: 0.95em;">■ 작용 하중 (상부구조 반력)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#d35400;">평상시 연직 P<sub>norm</sub> (kN)</label>
                <input type="number" id="pile_P_norm" value="${getVal('P_norm', '13791.2')}" step="0.1" class="pl-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#c0392b;">지진시 연직 P<sub>seis</sub> (kN)</label>
                <input type="number" id="pile_P_seis" value="${getVal('P_seis', '15034.5')}" step="0.1" class="pl-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#2980b9;">평상시 수평 H<sub>norm</sub> (kN)</label>
                <input type="number" id="pile_H_norm" value="${getVal('H_norm', '1496.2')}" step="0.1" class="pl-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#8e44ad;">지진시 수평 H<sub>seis</sub> (kN)</label>
                <input type="number" id="pile_H_seis" value="${getVal('H_seis', '3784.7')}" step="0.1" class="pl-input">
            </div>
        </div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #8e44ad; font-size: 0.95em;">■ 수평 해석 및 허용 기준 조건</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #f5eef8; padding: 10px; border-radius: 5px; border: 1px solid #d7bde2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
            <div class="input-group" style="background:#fff; margin:0;">
                <label>말뚝 두부 조건</label>
                <select id="pile_head_cond" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.88em; text-align:center;">
                    <option value="free" ${getVal('head_cond', 'free') === 'free' ? 'selected' : ''}>두부 자유 (Free)</option>
                    <option value="fixed" ${getVal('head_cond', 'free') === 'fixed' ? 'selected' : ''}>두부 고정 (Fixed)</option>
                </select>
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#8e44ad;">말뚝 탄성계수 E<sub>p</sub> (kN/m²)</label>
                <input type="number" id="pile_Ep" value="${getVal('Ep', defaultEp)}" step="100000" class="pl-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#d4ac0d;">허용 연직 침하량 (mm)</label>
                <input type="number" id="pile_allow_settle" value="${getVal('allow_settle', '25.0')}" step="0.1" class="pl-input">
            </div>
            <div class="input-group" style="background:#fff; margin:0;">
                <label style="color:#16a085;">허용 수평 변위량 (mm)</label>
                <input type="number" id="pile_allow_h_disp" value="${getVal('allow_h_disp', '30.0')}" step="0.1" class="pl-input">
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
        
        <div style="background-color: #e8f8f5; padding: 8px; border-radius: 6px; border: 1px solid #a3e4d7; margin-bottom: 15px;">
            <div class="table-container" style="margin: 0; overflow-x: auto;">
                <table class="result-table" style="font-size: 0.78em; text-align: center; margin: 0; width: 100%; min-width: 700px; table-layout: fixed;">
                    <thead>
                        <tr style="background-color: #d1f2eb;">
                            <th style="width: 13%; padding: 4px;">지층명</th>
                            <th style="width: 13%; padding: 4px;">토성구분</th>
                            <th style="width: 7%; padding: 4px;">층후<br>(m)</th>
                            <th style="width: 7%; padding: 4px;">N치</th>
                            <th style="width: 9%; padding: 4px;">&gamma;<br>(kN/m³)</th>
                            <th style="width: 9%; padding: 4px;">점착력 c<br>(kPa)</th>
                            <th style="width: 9%; padding: 4px;">마찰각 &phi;<br>(°)</th>
                            <th style="width: 14%; padding: 4px;">변형계수 E<sub>s</sub><br>(kPa)</th>
                            <th style="width: 12%; padding: 4px;">일축강도 q<sub>u</sub><br>(kPa)</th>
                            <th style="width: 5%; padding: 4px;">삭제</th>
                        </tr>
                    </thead>
                    <tbody id="pile_layers_body"></tbody>
                    <tfoot>
                        <tr style="background-color: #ebf5fb; font-weight: bold; border-top: 2px solid #a3e4d7;">
                            <td colspan="2" style="padding: 6px; text-align: right; color: #2980b9;">말뚝 총 길이 L (m) :</td>
                            <td id="pile_L_val" style="padding: 6px; color: #16a085; font-size: 1.05em;">${calcTotalL().toFixed(1)}</td>
                            <td colspan="7" style="padding: 6px; text-align: left; color: #7f8c8d; font-size: 0.9em;">(지층 층후 자동 합산)</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <button type="button" class="action-btn" id="calc-pile-btn" style="margin-top: 10px; cursor: pointer;">말뚝 지지력, 수평력 및 침하량 종합산정</button>
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
            qsText = "토사: AASHTO(2012) &beta; 산정식 (상한 190kPa) / 암반: Horvath & Kenney (1979) [Q<sub>s</sub> = 0.65 &times; &alpha;<sub>E</sub> &times; P<sub>a</sub> &times; (q<sub>u</sub>/P<sub>a</sub>)<sup>0.5</sup> &le; 7.8 &times; P<sub>a</sub> &times; (f'<sub>c</sub>/P<sub>a</sub>)<sup>0.5</sup>]";
        } else if (type === 'CAST') {
            if (qpVal === 'oneill') qpText = "57.4 &times; N (N&le;75) / 4,309.2 kN/m² (N>75) [O'Neill & Reese (1999)]";
            else qpText = "100 &times; N_bar (사질토) / 6 &times; c<sub>u</sub> (점성토) [건축기초 구조설계지침 (2004)]";
            if (qsVal === 'oneill') qsText = "AASHTO LRFD (2012) &beta; 산정식 적용 (사질토/풍화암/자갈층 상한 190 kPa)";
            else qsText = "3.3 &times; N (사질토, N&le;50) / 1.0 &times; c<sub>u</sub> (점성토, c<sub>u</sub>&le;100 kPa) [건축기초 구조설계지침 (2004)]";
        } else if (method === 'driven') {
            qpText = "300 &times; N (N&le;60)";
            if (qsVal === 'lh') qsText = "2.0 &times; N (사질토, N&le;50), 5.0 &times; q<sub>u</sub> (점성토, q<sub>u</sub>=2&times;c<sub>u</sub>, c<sub>u</sub>&le;125 kN/m²)";
            else qsText = "2.0 &times; N (사질토, 상한 100 kN/m²), 1.0 &times; c<sub>u</sub> (점성토, 상한 100 kN/m²)";
        } else {
            if (qpVal === 'lh') qpText = "250 &times; N (N&le;60)";
            else qpText = "200 &times; N (사질토, 상한 12,000 kN/m²), 6 &times; c<sub>u</sub> (점성토, 상한 12,000 kN/m²)";
            if (qsVal === 'lh') qsText = "2.0 &times; N (사질토, N&le;50), 5.0 &times; q<sub>u</sub> (점성토, q<sub>u</sub>=2&times;c<sub>u</sub>, c<sub>u</sub>&le;125 kN/m²)";
            else qsText = "2.5 &times; N (사질토, N&le;50), 0.8 &times; c<sub>u</sub> (점성토, c<sub>u</sub>&le;125 kN/m²)";
        }

        infoBox.innerHTML = `
            <div style="font-weight: bold; color: #16a085; margin-bottom: 2px;">▶ 적용 산정식 개요</div>
            <div style="margin-left: 6px; line-height: 1.5;">
                • <strong>연직 선단지지력 :</strong> ${qpText}<br>
                • <strong>연직 주면마찰력 :</strong> ${qsText}<br>
                • <strong>수평 지반반력계수 :</strong> 도로교 표준시방서(축차계산) 및 후쿠오카 공식 최소값 적용<br>
                • <strong>수평 지지력/변위 :</strong> Broms 극한평형법 및 Chang 탄성지반반력법 적용
            </div>
        `;
    }

    function updateMethodFormulas() {
        const type = container.querySelector('#pile_type').value;
        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qpSelect = container.querySelector('#pile_qp_formula');
        const qsSelect = container.querySelector('#pile_qs_formula');
        if (!qpSelect) return;

        const savedQp = getVal('qp_formula', 'rock_case2');
        const savedQs = getVal('qs_formula', 'horvath');

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

        if (!specSelect || !grid2Content || !row2Container) return;

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
                        <input type="number" id="pile_joint_count" value="0" min="0" class="pl-input" style="width:40px; height:100%;">
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
                    <input type="number" id="pile_t1" value="${initialT1}" step="0.1" placeholder="t1" class="pl-input" style="width:48px; border:1px solid #ccc; font-size:0.85em;">
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
                        <input type="number" id="pile_joint_count" value="${getVal('joint_count', '0')}" min="0" class="pl-input" style="width:40px; height:100%;">
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
                            <option value="7">A:벽개발달 탄산염암</option>
                            <option value="10">B:석화 이질암</option>
                            <option value="15">C:뚜렷한벽개 사질암</option>
                            <option value="17" selected>D:세립결정 화성암</option>
                            <option value="25">E:조립결정 화성변성</option>
                        </select>
                        <input type="number" id="pile_rmr" value="${getVal('rmr', '30')}" step="1" placeholder="RMR" class="pl-input" style="flex:1; min-width:0;">
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
            const initialRebarD = getVal('rebar_d', '38.10');
            const initialRebarFy = getVal('rebar_fy', '400');
            const initialRebarCount = getVal('rebar_count', '64');

            const rebarBoxHtml = `
                <div class="input-group" style="margin:0;">
                    <label>보강철근 제원</label>
                    <div style="display:flex; gap:2px; height:32px; align-items:center;">
                        <select id="pile_rebar_d" style="flex:1.2; min-width:0; height:100%; box-sizing:border-box; padding:2px; font-size:0.78em;" title="철근 직경">
                            <option value="19.10" ${initialRebarD === '19.10' ? 'selected' : ''}>D19</option>
                            <option value="22.20" ${initialRebarD === '22.20' ? 'selected' : ''}>D22</option>
                            <option value="25.40" ${initialRebarD === '25.40' ? 'selected' : ''}>D25</option>
                            <option value="28.60" ${initialRebarD === '28.60' ? 'selected' : ''}>D29</option>
                            <option value="31.80" ${initialRebarD === '31.80' ? 'selected' : ''}>D32</option>
                            <option value="34.90" ${initialRebarD === '34.90' ? 'selected' : ''}>D35</option>
                            <option value="38.10" ${initialRebarD === '38.10' ? 'selected' : ''}>D38</option>
                        </select>
                        <select id="pile_rebar_fy" style="flex:1.3; min-width:0; height:100%; box-sizing:border-box; padding:2px; font-size:0.78em;" title="항복강도">
                            <option value="400" ${initialRebarFy === '400' ? 'selected' : ''}>SD400</option>
                            <option value="500" ${initialRebarFy === '500' ? 'selected' : ''}>SD500</option>
                        </select>
                        <input type="number" id="pile_rebar_count" value="${initialRebarCount}" class="pl-input" placeholder="개수" style="width:38px; height:100%;">
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
                        <input type="number" id="pile_fck" value="${initialFck}" step="0.1" class="pl-input" style="height:32px;">
                    </div>
                    <div class="input-group" style="margin:0;">
                        <label>Joint 상태</label>
                        <select id="pile_joint_state" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.85em;">
                            <option value="closed" ${initialJointState === 'closed' ? 'selected' : ''}>Closed Joints</option>
                            <option value="open" ${initialJointState === 'open' ? 'selected' : ''}>Open Joints</option>
                        </select>
                    </div>
                    <div class="input-group" style="margin:0;">
                        <label>RQD (%)</label>
                        <input type="number" id="pile_rqd" value="${initialRqd}" step="0.1" class="pl-input" style="height:32px;">
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
                        <input type="number" id="pile_fck" value="${initialFck}" step="0.1" class="pl-input" style="height:32px;">
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

    container.addEventListener('click', (e) => {
        if (e.target.id === 'pile_layer_add') {
            const currentPileType = container.querySelector('#pile_type')?.value || 'PHC';
            const defaultType = currentPileType === 'CAST' ? 'sand' : 'sand';
            const nextIdx = pileLayers.length + 1;
            pileLayers.push({ name: `지층${nextIdx}`, type: defaultType, dz: 3.0, n_val: 30, gamma: 19.0, c_val: 0, phi: 30, es: 50000, qu_val: 0 });
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
        calcBtn.addEventListener('click', calculatePileCapacity);
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
        } else if (['pile_qp_formula', 'pile_qs_formula', 'pile_rmr', 'grid5_val', 'pile_fck', 'pile_joint_state', 'pile_rqd', 'pile_rebar_d', 'pile_rebar_fy', 'pile_rebar_count', 'pile_Ep', 'pile_allow_settle', 'pile_allow_h_disp', 'pile_head_cond', 'pile_H_norm', 'pile_H_seis'].includes(e.target.id)) {
            try { localStorage.setItem('geo_' + e.target.id, e.target.value); } catch(err){}
            if (e.target.id.includes('formula')) updateFormulaInfoText();
        }

        if (e.target.id === 'pile_gwt') {
            const val = parseFloat(e.target.value) || 0;
            e.target.value = val.toFixed(1);
            try { localStorage.setItem('geo_pile_gwt', e.target.value); } catch(err){}
        }
        if (e.target.classList.contains('pl-name')) pileLayers[e.target.dataset.idx].name = e.target.value;
        if (e.target.classList.contains('pl-type')) pileLayers[e.target.dataset.idx].type = e.target.value;
        if (e.target.classList.contains('pl-dz')) {
            const val = parseFloat(e.target.value) || 0;
            e.target.value = val.toFixed(1);
            pileLayers[e.target.dataset.idx].dz = val;
            updatePileLength();
        }
        if (e.target.classList.contains('pl-n')) {
            const val = Math.round(parseFloat(e.target.value) || 0);
            e.target.value = val.toFixed(0);
            pileLayers[e.target.dataset.idx].n_val = val;
        }
        if (e.target.classList.contains('pl-gamma')) {
            const val = parseFloat(e.target.value) || 19.0;
            e.target.value = val.toFixed(1);
            pileLayers[e.target.dataset.idx].gamma = val;
        }
        if (e.target.classList.contains('pl-c')) {
            const val = parseFloat(e.target.value) || 0;
            e.target.value = val.toFixed(1);
            pileLayers[e.target.dataset.idx].c_val = val;
        }
        if (e.target.classList.contains('pl-phi')) {
            const val = parseFloat(e.target.value) || 0;
            e.target.value = val.toFixed(1);
            pileLayers[e.target.dataset.idx].phi = val;
        }
        if (e.target.classList.contains('pl-es')) {
            const val = Math.round(parseFloat(e.target.value) || 0);
            e.target.value = val.toFixed(0);
            pileLayers[e.target.dataset.idx].es = val;
        }
        if (e.target.classList.contains('pl-qu')) {
            const val = Math.round(parseFloat(e.target.value) || 0);
            e.target.value = val.toFixed(0);
            pileLayers[e.target.dataset.idx].qu_val = val;
        }
        
        try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
    });

    updateUIState();

    function updatePileLength() {
        const totalL = calcTotalL();
        const pileLVal = container.querySelector('#pile_L_val');
        if (pileLVal) {
            pileLVal.textContent = totalL.toFixed(1);
            try { localStorage.setItem('geo_pile_L', totalL.toFixed(1)); } catch(err){}
        }
    }

    function renderLayers() {
        const tbody = container.querySelector('#pile_layers_body');
        if (!tbody) return;

        const currentPileType = container.querySelector('#pile_type')?.value || 'CAST_ROCK';

        tbody.innerHTML = '';
        pileLayers.forEach((l, idx) => {
            if (currentPileType === 'CAST' && l.type === 'rock') {
                l.type = 'weathered_rock';
            }
            const gammaVal = l.gamma !== undefined ? l.gamma : 19.0;
            const rockOptionHtml = currentPileType === 'CAST' ? '' : `<option value="rock" ${l.type === 'rock' ? 'selected' : ''}>기반암(연암)</option>`;

            tbody.innerHTML += `
                <tr>
                    <td style="padding:2px;"><input type="text" value="${l.name}" data-idx="${idx}" class="pl-name pl-input"></td>
                    <td style="padding:2px;">
                        <select data-idx="${idx}" class="pl-type pl-input" style="font-size:0.85em;">
                            <option value="sand" ${l.type === 'sand' ? 'selected' : ''}>사질토</option>
                            <option value="clay" ${l.type === 'clay' ? 'selected' : ''}>점성토</option>
                            <option value="gravel" ${l.type === 'gravel' ? 'selected' : ''}>자갈층</option>
                            <option value="weathered_rock" ${l.type === 'weathered_rock' ? 'selected' : ''}>풍화암</option>
                            ${rockOptionHtml}
                        </select>
                    </td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.dz).toFixed(1)}" data-idx="${idx}" class="pl-dz pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${Math.round(parseFloat(l.n_val)).toFixed(0)}" data-idx="${idx}" class="pl-n pl-input" step="1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(gammaVal).toFixed(1)}" data-idx="${idx}" class="pl-gamma pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.c_val).toFixed(1)}" data-idx="${idx}" class="pl-c pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.phi).toFixed(1)}" data-idx="${idx}" class="pl-phi pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${Math.round(parseFloat(l.es)).toFixed(0)}" data-idx="${idx}" class="pl-es pl-input" step="1"></td>
                    <td style="padding:2px;"><input type="number" value="${Math.round(parseFloat(l.qu_val)).toFixed(0)}" data-idx="${idx}" class="pl-qu pl-input" step="1"></td>
                    <td style="padding:2px;"><button type="button" class="pl-del" data-idx="${idx}" style="padding:2px 6px; background:#e74c3c; color:#fff; border:none; border-radius:3px; cursor:pointer;">-</button></td>
                </tr>
            `;
        });
        updatePileLength();
    }
    renderLayers();

    // Hoek & Brown 및 알파 계수 데이터
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
            const row1 = HB_TABLE_DATA[i], row2 = HB_TABLE_DATA[i + 1];
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
            if (rqdVal >= TABLE_EM_EI[i].rqd && rqdVal <= TABLE_EM_EI[i + 1].rqd) {
                const t = (rqdVal - TABLE_EM_EI[i].rqd) / (TABLE_EM_EI[i + 1].rqd - TABLE_EM_EI[i].rqd);
                return TABLE_EM_EI[i][key] + t * (TABLE_EM_EI[i + 1][key] - TABLE_EM_EI[i][key]);
            }
        }
        return 0.05;
    }

    function interpolateAlphaE(ratioVal) {
        if (ratioVal <= 0) return TABLE_ALPHA_E[0].alpha;
        if (ratioVal >= 1.0) return TABLE_ALPHA_E[TABLE_ALPHA_E.length - 1].alpha;
        for (let i = 0; i < TABLE_ALPHA_E.length - 1; i++) {
            if (ratioVal >= TABLE_ALPHA_E[i].ratio && ratioVal <= TABLE_ALPHA_E[i + 1].ratio) {
                const t = (ratioVal - TABLE_ALPHA_E[i].ratio) / (TABLE_ALPHA_E[i + 1].ratio - TABLE_ALPHA_E[i].ratio);
                return TABLE_ALPHA_E[i].alpha + t * (TABLE_ALPHA_E[i + 1].alpha - TABLE_ALPHA_E[i].alpha);
            }
        }
        return 0.370;
    }

    function getIps(dr_br, ec_em) {
        const x_vals = [0, 0.5, 1, 2, 3, 5];
        const y_ratios = [0.2, 0.5, 1, 2, 10, 50, 1000];
        const grid = [
            [0.55, 1.15, 1.30, 1.35, 1.38, 1.42],
            [0.55, 0.65, 0.68, 0.70, 0.71, 0.72],
            [0.55, 0.53, 0.53, 0.53, 0.53, 0.53],
            [0.55, 0.42, 0.38, 0.36, 0.35, 0.34],
            [0.55, 0.30, 0.25, 0.21, 0.20, 0.16],
            [0.55, 0.28, 0.21, 0.15, 0.13, 0.08],
            [0.55, 0.25, 0.18, 0.13, 0.09, 0.03]
        ];

        let dr = Math.max(0, Math.min(5, dr_br));
        let ec = Math.max(0.2, Math.min(1000, ec_em));
        
        let c0 = 0, c1 = 1;
        while(c1 < x_vals.length - 1 && x_vals[c1] < dr) { c0++; c1++; }
        let tx = (dr - x_vals[c0]) / (x_vals[c1] - x_vals[c0]);

        let r0 = 0, r1 = 1;
        while(r1 < y_ratios.length - 1 && y_ratios[r1] < ec) { r0++; r1++; }
        let ty = (Math.log10(ec) - Math.log10(y_ratios[r0])) / (Math.log10(y_ratios[r1]) - Math.log10(y_ratios[r0]));

        let v00 = grid[r0][c0], v01 = grid[r0][c1];
        let v10 = grid[r1][c0], v11 = grid[r1][c1];
        let v0 = v00 + tx * (v01 - v00);
        let v1 = v10 + tx * (v11 - v10);
        return v0 + ty * (v1 - v0);
    }

    // 수평방향 지반반력계수(kh) 축차계산 및 수평해석 지원 함수
    function calcSoilAvgWithinDepth(targetDepth, layers) {
        let cumDepth = 0;
        let sumN = 0, sumEs = 0, sumCovered = 0;

        for (let l of layers) {
            let dz = parseFloat(l.dz) || 0;
            let nval = parseFloat(l.n_val) || 0;
            let esval = parseFloat(l.es) || (2800 * nval);

            let lTop = cumDepth;
            let lBot = cumDepth + dz;

            if (lTop >= targetDepth) break;

            let coverStart = lTop;
            let coverEnd = Math.min(lBot, targetDepth);
            let coverLen = coverEnd - coverStart;

            if (coverLen > 0) {
                sumN += nval * coverLen;
                sumEs += esval * coverLen;
                sumCovered += coverLen;
            }
            cumDepth += dz;
        }

        if (sumCovered <= 0) {
            let first = layers[0] || { n_val: 10, es: 28000 };
            return { avgN: parseFloat(first.n_val) || 10, avgEs: parseFloat(first.es) || 28000 };
        }

        return { avgN: sumN / sumCovered, avgEs: sumEs / sumCovered };
    }

    function calculateHorizontalSoilReaction(alpha, Ep, D, Ip_cm4, layers) {
        const EI = Ep * (Ip_cm4 / 1.0e8); // kN·m²

        // 1. 도로교 표준시방서 축차계산
        let beta = 0.20000; // [가정값] 초기가정
        let stepsRoad = [];
        let kh_road = 0, E0_road = 0, avgN_road = 0, invBeta_road = 0;

        for (let step = 1; step <= 9; step++) {
            invBeta_road = 1.0 / beta;
            let soilInfo = calcSoilAvgWithinDepth(invBeta_road, layers);
            avgN_road = soilInfo.avgN;
            E0_road = soilInfo.avgEs;

            let BH = Math.sqrt(D / beta);
            let kh0 = (1.0 / 0.3) * alpha * E0_road;
            kh_road = kh0 * Math.pow((1.0 / 0.3) * BH, -0.75);

            let newBeta = Math.pow((kh_road * D) / (4.0 * EI), 0.25);
            let err = Math.abs((newBeta - beta) / beta) * 100.0;

            stepsRoad.push({
                step: `Step ${step}`,
                beta_in: beta,
                inv_beta: invBeta_road,
                N: avgN_road,
                E0: E0_road,
                kh: kh_road,
                beta_out: newBeta,
                err: err
            });

            if (err < 0.01) break;
            beta = newBeta;
        }

        // 2. 후쿠오카 공식 축차계산
        let betaF = 0.20000; // [가정값] 초기가정
        let stepsFukuoka = [];
        let kh_fukuoka = 0, avgN_fukuoka = 0, invBeta_fukuoka = 0;

        for (let step = 1; step <= 9; step++) {
            invBeta_fukuoka = 1.0 / betaF;
            let soilInfo = calcSoilAvgWithinDepth(invBeta_fukuoka, layers);
            avgN_fukuoka = soilInfo.avgN;

            kh_fukuoka = 0.691 * Math.pow(avgN_fukuoka, 0.406) * 1000.0; // kN/m³

            let newBetaF = Math.pow((kh_fukuoka * D) / (4.0 * EI), 0.25);
            let err = Math.abs((newBetaF - betaF) / betaF) * 100.0;

            stepsFukuoka.push({
                step: `Step ${step}`,
                beta_in: betaF,
                inv_beta: invBeta_fukuoka,
                N: avgN_fukuoka,
                kh: kh_fukuoka,
                beta_out: newBetaF,
                err: err
            });

            if (err < 0.01) break;
            betaF = newBetaF;
        }

        let applied_kh = Math.min(kh_road, kh_fukuoka);
        let applied_beta = Math.pow((applied_kh * D) / (4.0 * EI), 0.25);

        return {
            EI: EI,
            kh_road: kh_road,
            beta_road: beta,
            invBeta_road: invBeta_road,
            N_road: avgN_road,
            E0_road: E0_road,
            stepsRoad: stepsRoad,
            kh_fukuoka: kh_fukuoka,
            beta_fukuoka: betaF,
            invBeta_fukuoka: invBeta_fukuoka,
            N_fukuoka: avgN_fukuoka,
            stepsFukuoka: stepsFukuoka,
            applied_kh: applied_kh,
            applied_beta: applied_beta
        };
    }

    // 연직지지력, 수평지지력 및 침하량 통합 산정
    function calculatePileCapacity() {
        const p_type = container.querySelector('#pile_type').value;
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

        const D_mm = parseFloat(container.querySelector('#pile_D').value) || 3000;
        const D = D_mm / 1000.0;
        const t_mm = (p_type === 'CAST' || p_type === 'CAST_ROCK') ? 0 : parseFloat(container.querySelector('#pile_t').value);
        const grid5Val = parseFloat(container.querySelector('#grid5_val').value) || 0;
        const gwt = parseFloat(container.querySelector('#pile_gwt')?.value) || 3.1;
        const allow_settle = parseFloat(container.querySelector('#pile_allow_settle')?.value) || 25.0;
        const allow_h_disp = parseFloat(container.querySelector('#pile_allow_h_disp')?.value) || 30.0;
        const head_cond = container.querySelector('#pile_head_cond')?.value || 'free';

        let t1_mm = 0;
        if (p_type === 'STEEL') {
            const t1Elem = container.querySelector('#pile_t1');
            if (t1Elem) t1_mm = parseFloat(t1Elem.value) || 0;
        }

        let user_fck = 27.0, user_joint_state = 'closed', user_rqd = 4.0;
        let em_ei_val = 0.01, alpha_e_val = 0.370;
        let user_rebar_d_mm = 38.10, user_rebar_fy_MPa = 400, user_rebar_count = 64;

        if (p_type === 'CAST' || p_type === 'CAST_ROCK') {
            user_fck = parseFloat(container.querySelector('#pile_fck')?.value) || 27.0;
            user_rebar_d_mm = parseFloat(container.querySelector('#pile_rebar_d')?.value) || 38.10;
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

        let user_Ep = parseFloat(container.querySelector('#pile_Ep')?.value) || 26700000;

        // 1. 연직 선단지지력 (Qup)
        let lastLayer = pileLayersData.length > 0 ? pileLayersData[pileLayersData.length - 1] : { name: '지지층', type: 'sand', n_val: 50, gamma: 20.0, c_val: 0, qu_val: 0 };
        let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
        let c_tip = parseFloat(lastLayer.c_val) || 0;
        let qu_tip = parseFloat(lastLayer.qu_val) || 0;
        const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
        
        let q_p = 0; 
        let qp_calc_detail = "";
        let hbRes = null, hb_m = 0, hb_s = 0, hb_mi = 17, input_rmr = 30;

        if (p_type === 'CAST_ROCK') {
            if (qp_formula_key === 'rock_case1') {
                q_p = 2.5 * qu_tip;
                qp_calc_detail = `• 공식: q<sub>p</sub> = 2.5 &times; q<sub>u</sub><br>` +
                                 `• 계산: q<sub>p</sub> = 2.5 &times; ${qu_tip}<br>` +
                                 `• 결과: q<sub>p</sub> = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            } else {
                hb_mi = parseInt(container.querySelector('#pile_rock_type')?.value) || 17;
                input_rmr = parseFloat(container.querySelector('#pile_rmr')?.value) || 30;
                hbRes = interpolateHoekBrown(input_rmr, hb_mi);
                hb_m = hbRes.m; hb_s = hbRes.s;
                let factor = Math.sqrt(hb_s) + Math.sqrt(hb_m * Math.sqrt(hb_s) + hb_s);
                q_p = factor * qu_tip;
                qp_calc_detail = `• 공식: q<sub>p</sub> = [&radic;s + &radic;(m&radic;s + s)] &times; q<sub>u</sub><br>` +
                                 `• 계산: [&radic;${hb_s.toExponential(3)} + &radic;(${hb_m.toFixed(4)}&times;&radic;${hb_s.toExponential(3)} + ${hb_s.toExponential(3)})] &times; ${qu_tip} = ${factor.toFixed(4)} &times; ${qu_tip}<br>` +
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
                let isGranular = ['sand', 'gravel', 'weathered_rock'].includes(lastLayer.type);
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

        // 2. 연직 주면마찰력 (Qus)
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
            let qu_val_i = parseFloat(l.qu_val) || 0; 

            let z_mid = cum_depth + 0.5 * dz_i;
            let sigma_v_mid = cum_sigma_v + gamma_i * (0.5 * dz_i);
            let u_mid = Math.max(0, (z_mid - gwt) * 9.81);
            let sigma_v_prime = Math.max(0, sigma_v_mid - u_mid);

            if (l.type === 'rock' && p_type === 'CAST_ROCK') {
                let P_a = 0.101; 
                let qu_MPa = qu_val_i / 1000.0; 
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
                let isGranular = ['sand', 'gravel', 'weathered_rock'].includes(l.type);
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
                dz: dz_i, n_val: l.n_val, gamma: gamma_i, c_val: c_val_i, qu_val: qu_val_i,
                z_mid: z_mid, sigma_v_prime: sigma_v_prime,
                formula: formula_str, fxL: fxL, qusi: Qus_i
            });

            cum_depth += dz_i;
            cum_sigma_v += gamma_i * dz_i;
        });

        const Qu_total = Qup + total_Qus;
        const Qa_soil_norm = Qu_total / 3.0;
        const Qa_soil_seis = Qu_total / 2.0;

        // 3. 재료 허용압축하중 (Qas)
        let Q_mat_base = 0;
        let qMatBaseDetailStr = "";
        let A_net = 0;
        let Ip_cm4 = (Math.PI * Math.pow(D, 4)) / 64.0 * 1.0e8; // cm4
        let Z_m3 = (Math.PI * Math.pow(D, 3)) / 32.0; // m3

        if (p_type === 'CAST' || p_type === 'CAST_ROCK') {
            const Ac_gross = Ap; 
            const db_m = user_rebar_d_mm / 1000.0;
            const Ab_single = (Math.PI * Math.pow(db_m, 2)) / 4.0; 
            const Ast = user_rebar_count * Ab_single; 
            const Ac_net = Math.max(0, Ac_gross - Ast); 
            A_net = Ac_gross;
            const fca_kNm2 = Math.min(0.25 * user_fck, 8.5) * 1000.0; 
            const fsa_rebar_kNm2 = 0.40 * user_rebar_fy_MPa * 1000.0; 
            Q_mat_base = (fca_kNm2 * Ac_net) + (fsa_rebar_kNm2 * Ast); 

            qMatBaseDetailStr = `
                • <strong>말뚝의 장기허용압축강도 (f<sub>sa</sub> A) 산정 :</strong><br>
                &nbsp;&nbsp;- 말뚝 단면적 (A) = ${frac("&pi; &times; D²", "4")} = ${frac(`&pi; &times; ${D.toFixed(3)}²`, "4")} = <strong>${Ac_gross.toFixed(4)} m²</strong><br>
                &nbsp;&nbsp;- 보강철근 단면적 (A<sub>st</sub>) = n &times; ${frac("&pi; &times; d<sub>b</sub>²", "4")} = ${user_rebar_count} &times; ${frac(`&pi; &times; ${(user_rebar_d_mm/1000).toFixed(4)}²`, "4")} = <strong>${Ast.toFixed(6)} m²</strong><br>
                &nbsp;&nbsp;- 콘크리트 순단면적 (A<sub>c</sub>) = A - A<sub>st</sub> = ${Ac_gross.toFixed(4)} - ${Ast.toFixed(6)} = <strong>${Ac_net.toFixed(4)} m²</strong><br>
                &nbsp;&nbsp;- 콘크리트 허용압축강도 (f<sub>ca</sub>) = min(0.25 &times; f'<sub>c</sub>, 8.5 MPa) = <strong>${fca_kNm2.toLocaleString()} kN/m²</strong><br>
                &nbsp;&nbsp;- 총 기본 허용압축하중 (Q<sub>mat_base</sub>) = (f<sub>ca</sub> &times; A<sub>c</sub>) + (f<sub>sa,rebar</sub> &times; A<sub>st</sub>) = <strong>${Q_mat_base.toFixed(1)} kN</strong>
            `;
        } else if (p_type === 'PHC') {
            A_net = Ap;
            Q_mat_base = grid5Val;
            qMatBaseDetailStr = `
                • <strong>기본 허용압축하중 (Q<sub>mat_base</sub>) 산정 :</strong><br>
                &nbsp;&nbsp;- 산정 결과: Q<sub>mat_base</sub> = P<sub>a</sub> = <strong>${Q_mat_base.toFixed(1)} kN</strong>
            `;
        } else if (p_type === 'STEEL') {
            let D_out = D - (t1_mm / 1000.0);
            let D_in = Math.max(0, D - 2.0 * (t_mm / 1000.0));
            A_net = (Math.PI * (Math.pow(D_out, 2) - Math.pow(D_in, 2))) / 4.0;
            Ip_cm4 = (Math.PI * (Math.pow(D_out, 4) - Math.pow(D_in, 4))) / 64.0 * 1.0e8;
            Z_m3 = (Math.PI * (Math.pow(D_out, 4) - Math.pow(D_in, 4))) / (32.0 * D_out);
            Q_mat_base = grid5Val * A_net;
            qMatBaseDetailStr = `
                • <strong>강관말뚝 순단면적 (A<sub>net</sub>) 산정 :</strong><br>
                &nbsp;&nbsp;- 계산: ${frac(`&pi; &times; (${D_out.toFixed(4)}² - ${D_in.toFixed(4)}²)`, "4")} = <strong>${A_net.toFixed(5)} m²</strong><br>
                • <strong>기본 허용압축하중 (Q<sub>mat_base</sub>) 산정 :</strong> Q<sub>mat_base</sub> = <strong>${Q_mat_base.toFixed(1)} kN</strong>
            `;
        }

        const L_over_D = L / D;
        let n_limit = p_type.includes('CAST') ? 60 : 85;
        let mu1 = Math.max(0, L_over_D - n_limit);
        let mu2 = (method === 'bored' || p_type.includes('CAST')) ? ((joint_type === 'weld' ? 5.0 : (joint_type === 'bolt' ? 10.0 : 0.0)) * 0.5 * joint_cnt) : ((joint_type === 'weld' ? 5.0 : (joint_type === 'bolt' ? 10.0 : 0.0)) * joint_cnt);
        const Qas = (1.0 - (mu1 + mu2) / 100.0) * Q_mat_base;

        const Q_app_norm = Math.min(Qa_soil_norm, Qas);
        const Q_app_seis = Math.min(Qa_soil_seis, Qas);
        const status_norm = P_norm <= Q_app_norm ? `안정 (O.K)` : `NG`;
        const status_seis = P_seis <= Q_app_seis ? `안정 (O.K)` : `NG`;

        // 4. 수평 지반반력계수(kh) 및 수평지지력/수평변위 산정 (구조계산서 11~17p 절차)
        const horizNorm = calculateHorizontalSoilReaction(1.0, user_Ep, D, Ip_cm4, pileLayersData); // 상시 (alpha=1) [가정값]
        const horizSeis = calculateHorizontalSoilReaction(2.0, user_Ep, D, Ip_cm4, pileLayersData); // 지진시 (alpha=2) [가정값]

        const kh_norm = horizNorm.applied_kh;
        const beta_norm = horizNorm.applied_beta;
        const kh_seis = horizSeis.applied_kh;
        const beta_seis = horizSeis.applied_beta;

        // 수평지지력 산정 매개변수
        const fy_kNm2 = 27000.0; // 27,000 kPa (27 MPa) [가정값]
        const h_load_point = 0.0; // 하중 작용점 높이 h = 0.0 m [가정값]
        const My_kNm = fy_kNm2 * Z_m3; // 항복모멘트 My (kN·m)

        // 표층 대표 지반 상수 (사질토 기준)
        const topLayer = pileLayersData[0] || { c_val: 5, phi: 25, gamma: 18.5 };
        const phi_rad = ((topLayer.phi || 25) * Math.PI) / 180.0;
        const Kp = (1.0 + Math.sin(phi_rad)) / (1.0 - Math.sin(phi_rad));
        const gamma_sub = topLayer.gamma ? Math.max(8.5, topLayer.gamma - 9.81) : 8.5; // 수중단위중량 [가정값]

        // Broms법 특성치 및 긴말뚝 수평극한지지력 Hu 산정식 (사질토, 두부자유, eta*L > 4.0)
        let chi_norm = 1.0 / beta_norm;
        let eta_h_norm = (kh_norm * D) / chi_norm;
        let eta_norm = Math.pow(eta_h_norm / horizNorm.EI, 0.2);
        let etaL_norm = eta_norm * L;

        let chi_seis = 1.0 / beta_seis;
        let eta_h_seis = (kh_seis * D) / chi_seis;
        let eta_seis = Math.pow(eta_h_seis / horizSeis.EI, 0.2);
        let etaL_seis = eta_seis * L;

        // Broms 수평극한저항력 Hu 산정
        let Kp_gamma_D3 = Kp * gamma_sub * Math.pow(D, 3);
        let Kp_gamma_D4 = Kp * gamma_sub * Math.pow(D, 4);
        let My_ratio = My_kNm / Kp_gamma_D4;

        let Hu_norm = 2.38 * Math.pow(My_ratio, 2.0 / 3.0) * Kp_gamma_D3;
        let Hu_seis = 2.38 * Math.pow(My_ratio, 2.0 / 3.0) * Kp_gamma_D3;

        let Ha_broms_norm = Hu_norm / 3.0; // [가정값: 안전율 F.S = 3.0]
        let Ha_broms_seis = Hu_seis / 2.0; // [가정값: 안전율 F.S = 2.0]

        // Chang 탄성지반반력법 (허용변위 delta_sa 기준)
        const delta_sa_m = allow_h_disp / 1000.0; // [가정값: 허용수평변위량 30mm]
        let Ha_chang_norm = (head_cond === 'fixed' ? 2.0 : 1.0) * (kh_norm * D * delta_sa_m) / beta_norm;
        let Ha_chang_seis = (head_cond === 'fixed' ? 2.0 : 1.0) * (kh_seis * D * delta_sa_m) / beta_seis;

        let Ha_app_norm = Math.min(Ha_broms_norm, Ha_chang_norm);
        let Ha_app_seis = Math.min(Ha_broms_seis, Ha_chang_seis);

        let h_status_norm = H_norm <= Ha_app_norm ? `안정 (O.K)` : `NG`;
        let h_status_seis = H_seis <= Ha_app_seis ? `안정 (O.K)` : `NG`;

        // Chang 탄성식에 의한 지표면 발생 수평변위량 (mm)
        let disp_norm_mm = ((head_cond === 'fixed' ? 0.5 : 1.0) * (H_norm * beta_norm) / (kh_norm * D)) * 1000.0;
        let disp_seis_mm = ((head_cond === 'fixed' ? 0.5 : 1.0) * (H_seis * beta_seis) / (kh_seis * D)) * 1000.0;

        let disp_status_norm = disp_norm_mm <= allow_h_disp ? `안정 (O.K)` : `NG`;
        let disp_status_seis = disp_seis_mm <= allow_h_disp ? `안정 (O.K)` : `NG`;

        // 5. 연직 침하량 검토 (Pells & Turner, 1979)
        let settlementHtmlStr = "";
        let finalS_norm = 0, finalS_seis = 0;
        let pellsTurnerSummary = "";

        if (p_type === 'CAST_ROCK') {
            let sumDr = 0, sumLs = 0;
            let lastRockEs = 50000;
            pileLayersData.forEach(l => {
                if(l.type === 'rock') {
                    sumDr += parseFloat(l.dz);
                    lastRockEs = parseFloat(l.es);
                } else {
                    sumLs += parseFloat(l.dz);
                }
            });

            if (sumDr === 0) sumDr = parseFloat(pileLayersData[pileLayersData.length - 1].dz);

            const D_r = sumDr;
            const B_r = D;
            const E_m = lastRockEs; 
            const L_s = sumLs; 
            
            const fcu = user_fck + 4;
            const E_c_MPa = 8500 * Math.pow(fcu, 1/3); 
            const E_c = E_c_MPa * 1000; 

            const ec_em = E_c / E_m;
            const dr_br = D_r / B_r;
            const I_ps = getIps(dr_br, ec_em);

            finalS_norm = P_norm * ( (I_ps / (D_r * E_m)) + (L_s / (A_net * E_c)) ) * 1000;
            finalS_seis = P_seis * ( (I_ps / (D_r * E_m)) + (L_s / (A_net * E_c)) ) * 1000;

            const svgWidth = 600, svgHeight = 350;
            const padX = 60, padY = 40;
            const plotW = svgWidth - padX * 2, plotH = svgHeight - padY * 2;
            
            const logMin = -1; 
            const logMax = 0.477; 
            
            const getPx = (x) => padX + (Math.max(0, Math.min(5, x)) / 5.0) * plotW;
            const getPy = (y) => padY + plotH - ((Math.max(-1, Math.min(logMax, Math.log10(y))) - logMin) / (logMax - logMin)) * plotH;

            const gridLinesY = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 2.0];
            let yGridStr = gridLinesY.map(y => {
                let py = getPy(y);
                return `<line x1="${padX}" y1="${py}" x2="${padX+plotW}" y2="${py}" stroke="#e0e0e0" stroke-width="1"/>
                        <text x="${padX-5}" y="${py+4}" font-size="11" text-anchor="end" fill="#555">${y.toFixed(1)}</text>`;
            }).join('');

            const gridLinesX = [0, 1, 2, 3, 4, 5];
            let xGridStr = gridLinesX.map(x => {
                let px = getPx(x);
                return `<line x1="${px}" y1="${padY}" x2="${px}" y2="${padY+plotH}" stroke="#e0e0e0" stroke-width="1"/>
                        <text x="${px}" y="${padY+plotH+15}" font-size="11" text-anchor="middle" fill="#555">${x}</text>`;
            }).join('');

            const curves = [
                { r: 0.2, color: '#34495e', pts: [[0, 0.53], [0.5, 1.15], [1, 1.30], [2, 1.35], [3, 1.38], [5, 1.42]] },
                { r: 0.5, color: '#34495e', pts: [[0, 0.53], [0.5, 0.65], [1, 0.68], [2, 0.70], [3, 0.71], [5, 0.72]] },
                { r: 1.0, color: '#34495e', pts: [[0, 0.53], [1, 0.53], [2, 0.53], [3, 0.53], [5, 0.53]] },
                { r: 2.0, color: '#34495e', pts: [[0, 0.53], [0.5, 0.42], [1, 0.38], [2, 0.36], [3, 0.35], [5, 0.34]] },
                { r: 10,  color: '#34495e', pts: [[0, 0.53], [0.5, 0.30], [1, 0.25], [2, 0.21], [3, 0.20], [5, 0.16]] },
                { r: 50,  color: '#34495e', pts: [[0, 0.53], [0.5, 0.28], [1, 0.21], [2, 0.15], [3, 0.13], [5, 0.08]] },
                { r: 1000, color: '#34495e', pts: [[0, 0.53], [0.5, 0.25], [1, 0.18], [2, 0.13], [3, 0.09], [5, 0.03]] }
            ];

            let pathStr = curves.map(c => {
                let d = c.pts.map((p, i) => `${i===0?'M':'L'} ${getPx(p[0])} ${getPy(p[1])}`).join(' ');
                let label = c.r === 1000 ? '∞' : c.r;
                let lastPt = c.pts[c.pts.length-2];
                return `<path d="${d}" fill="none" stroke="${c.color}" stroke-width="2"/>
                        <text x="${getPx(lastPt[0])}" y="${getPy(lastPt[1])-5}" font-size="11" font-weight="bold" fill="${c.color}">${label}</text>`;
            }).join('');

            const ptX = getPx(dr_br), ptY = getPy(I_ps);

            pellsTurnerSummary = `
                <tr>
                    <td rowspan="2" style="background:#f5eef8; font-weight:bold;">연직 침하량 검토</td>
                    <td>평상시 (Pells & Turner)</td>
                    <td style="font-weight:bold; color:#8e44ad;">${finalS_norm.toFixed(2)} mm</td>
                    <td rowspan="2" style="vertical-align: middle;">${allow_settle.toFixed(1)} mm</td>
                    <td style="font-weight:bold; color:${finalS_norm <= allow_settle ? '#27ae60' : '#c0392b'};">${finalS_norm <= allow_settle ? '안정 (O.K)' : 'NG'}</td>
                </tr>
                <tr>
                    <td>지진시 (Pells & Turner)</td>
                    <td style="font-weight:bold; color:#8e44ad;">${finalS_seis.toFixed(2)} mm</td>
                    <td style="font-weight:bold; color:${finalS_seis <= allow_settle ? '#27ae60' : '#c0392b'};">${finalS_seis <= allow_settle ? '안정 (O.K)' : 'NG'}</td>
                </tr>
            `;

            settlementHtmlStr = `
                <div class="section-title">[검증 3] 현장타설말뚝(암반소켓) 연직침하량 산정 (Pells & Turner, 1979)</div>
                <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                    <strong>■ 암반소켓 침하량 영향계수 (I<sub>ps</sub>) 산출</strong><br>
                    &nbsp;&nbsp;- 콘크리트 탄성계수 (E<sub>c</sub>) : 8500 &times; (f'<sub>ck</sub>+4)<sup>1/3</sup> = <strong>${E_c.toExponential(3)} kPa</strong><br>
                    &nbsp;&nbsp;- 암반 변형계수 (E<sub>m</sub>) : <strong>${E_m.toExponential(3)} kPa</strong><br>
                    &nbsp;&nbsp;- 강성비 (${frac("E<sub>c</sub>", "E<sub>m</sub>")}) : ${frac(E_c.toExponential(3), E_m.toExponential(3))} = <strong>${ec_em.toFixed(2)}</strong><br>
                    &nbsp;&nbsp;- 근입비 (${frac("D<sub>r</sub>", "B<sub>r</sub>")}) : ${frac(D_r.toFixed(2), B_r.toFixed(2))} = <strong>${dr_br.toFixed(2)}</strong><br>
                    &nbsp;&nbsp;▶ 그래프 보간 산출 영향계수 (I<sub>ps</sub>) = <span style="font-weight:bold; color:#e67e22; font-size:1.1em;">${I_ps.toFixed(3)}</span><br>
                    
                    <div style="text-align:center; margin: 15px 0;">
                        <svg width="${svgWidth}" height="${svgHeight}" style="background:white; border:1px solid #bdc3c7; border-radius:4px;">
                            ${yGridStr} ${xGridStr} ${pathStr}
                            <rect x="${padX}" y="${padY}" width="${plotW}" height="${plotH}" fill="none" stroke="#2c3e50" stroke-width="2"/>
                            <text x="${padX-35}" y="${svgHeight/2}" transform="rotate(-90 ${padX-35},${svgHeight/2})" font-size="13" font-weight="bold">I_ps</text>
                            <text x="${svgWidth/2}" y="${svgHeight-10}" font-size="13" font-weight="bold">Dr / Br</text>
                            <circle cx="${ptX}" cy="${ptY}" r="6" fill="#e74c3c" stroke="white" stroke-width="2"/>
                            <text x="${ptX+10}" y="${ptY+4}" font-size="12" font-weight="bold" fill="#e74c3c">${I_ps.toFixed(3)}</text>
                        </svg>
                    </div>
                </div>

                <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height: 1.6;">
                    <strong>■ Pells & Turner 침하량 산정결과</strong><br>
                    &nbsp;&nbsp;- 공식: S<sub>t</sub> = Q &times; [ ${frac("I<sub>ps</sub>", "D<sub>r</sub> &times; E<sub>m</sub>")} + ${frac("L<sub>s</sub>", "A &times; E<sub>c</sub>")} ]<br>
                    &nbsp;&nbsp;- <strong>평상시 침하량</strong> = ${P_norm.toFixed(1)} &times; [ ${frac(I_ps.toFixed(3), `${D_r.toFixed(2)} &times; ${E_m.toLocaleString()}`)} + ${frac(L_s.toFixed(2), `${A_net.toFixed(5)} &times; ${E_c.toExponential(3)}`)} ] &times; 1000 = <strong><span style="color:#8e44ad;">${finalS_norm.toFixed(3)} mm</span></strong><br>
                    &nbsp;&nbsp;- <strong>지진시 침하량</strong> = ${P_seis.toFixed(1)} &times; [ ${frac(I_ps.toFixed(3), `${D_r.toFixed(2)} &times; ${E_m.toLocaleString()}`)} + ${frac(L_s.toFixed(2), `${A_net.toFixed(5)} &times; ${E_c.toExponential(3)}`)} ] &times; 1000 = <strong><span style="color:#8e44ad;">${finalS_seis.toFixed(3)} mm</span></strong>
                </div>
            `;
        }

        const resultDiv = container.querySelector('#pile-result');
        if (!resultDiv) return;
        resultDiv.style.display = 'block';

        resultDiv.innerHTML = `
            <div class="section-title">[말뚝기초 지지력, 수평력 및 침하량 최종 검토 요약]</div>
            <div class="table-container">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th colspan="2">검토 항목</th>
                            <th>산정값 (작용값)</th>
                            <th>기준값 (허용값)</th>
                            <th>검토 결과</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td rowspan="2" style="background:#eaf2f8; font-weight:bold;">연직지지력 검토</td>
                            <td>평상시 (상시)</td>
                            <td style="font-weight:bold; color:#2980b9;">${P_norm.toFixed(1)} kN</td>
                            <td>${Q_app_norm.toFixed(1)} kN</td>
                            <td style="font-weight:bold; color:${P_norm <= Q_app_norm ? '#27ae60' : '#c0392b'};">${status_norm}</td>
                        </tr>
                        <tr>
                            <td>내진시 (지진시)</td>
                            <td style="font-weight:bold; color:#2980b9;">${P_seis.toFixed(1)} kN</td>
                            <td>${Q_app_seis.toFixed(1)} kN</td>
                            <td style="font-weight:bold; color:${P_seis <= Q_app_seis ? '#27ae60' : '#c0392b'};">${status_seis}</td>
                        </tr>
                        ${pellsTurnerSummary}
                        <tr>
                            <td rowspan="2" style="background:#e8f8f5; font-weight:bold;">수평지지력 검토</td>
                            <td>평상시 (상시)</td>
                            <td style="font-weight:bold; color:#27ae60;">${H_norm.toFixed(1)} kN</td>
                            <td>${Ha_app_norm.toFixed(1)} kN</td>
                            <td style="font-weight:bold; color:${H_norm <= Ha_app_norm ? '#27ae60' : '#c0392b'};">${h_status_norm}</td>
                        </tr>
                        <tr>
                            <td>내진시 (지진시)</td>
                            <td style="font-weight:bold; color:#27ae60;">${H_seis.toFixed(1)} kN</td>
                            <td>${Ha_app_seis.toFixed(1)} kN</td>
                            <td style="font-weight:bold; color:${H_seis <= Ha_app_seis ? '#27ae60' : '#c0392b'};">${h_status_seis}</td>
                        </tr>
                        <tr>
                            <td rowspan="2" style="background:#fef9e7; font-weight:bold;">수평 변위 검토</td>
                            <td>평상시 (상시)</td>
                            <td style="font-weight:bold; color:#d35400;">${disp_norm_mm.toFixed(2)} mm</td>
                            <td rowspan="2" style="vertical-align: middle;">${allow_h_disp.toFixed(1)} mm</td>
                            <td style="font-weight:bold; color:${disp_norm_mm <= allow_h_disp ? '#27ae60' : '#c0392b'};">${disp_status_norm}</td>
                        </tr>
                        <tr>
                            <td>내진시 (지진시)</td>
                            <td style="font-weight:bold; color:#d35400;">${disp_seis_mm.toFixed(2)} mm</td>
                            <td style="font-weight:bold; color:${disp_seis_mm <= allow_h_disp ? '#27ae60' : '#c0392b'};">${disp_status_seis}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="section-title">[검증 1] 지반에 의한 연직 허용지지력 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                <strong>(1) 말뚝 선단지지력 (Q<sub>up</sub>)</strong><br>
                • 단위면적당 극한선단지지력 q<sub>p</sub> :<br>
                <div style="margin-left: 15px; background: #fdf2e9; padding: 10px; border-radius: 4px; margin: 6px 0; line-height: 1.6; font-size: 0.9em; color: #2c3e50; border: 1px solid #fae5d3;">${qp_calc_detail}</div>
                • <strong>극한선단지지력 Q<sub>up</sub></strong> = q<sub>p</sub> &times; A<sub>p</sub> = ${q_p.toFixed(1)} &times; ${Ap.toFixed(5)} = <span style="font-weight:bold; color:#2980b9;">${Qup.toFixed(1)} kN</span>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                <strong>(2) 말뚝 주면마찰력 (Q<sub>us</sub>)</strong><br>
                • <strong>총 극한주면마찰력 Q<sub>us</sub></strong> = &sum; (f<sub>s,i</sub> &times; L<sub>i</sub>) &times; A<sub>s</sub> = <span style="font-weight:bold; color:#2980b9;">${total_Qus.toFixed(1)} kN</span>

                <div class="table-container" style="margin-top: 10px; margin-bottom: 5px;">
                    <table class="result-table" style="font-size: 0.92em; text-align: center;">
                        <thead>
                            <tr style="background-color: #eaeded;">
                                <th>지층명</th>
                                <th>토성구분</th>
                                <th>층후<br>(m)</th>
                                <th>N치 / &gamma; / qu</th>
                                <th style="min-width: 320px;">단위 마찰력 f<sub>s</sub> 계산 과정 (kN/m²)</th>
                                <th>f<sub>s</sub> &times; L</th>
                                <th>Q<sub>us,i</sub> (kN)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${layer_calc_rows.map(r => `
                                <tr>
                                    <td>${r.name}</td>
                                    <td>${r.type}</td>
                                    <td>${r.dz.toFixed(1)}</td>
                                    <td>${Math.round(r.n_val)} / ${r.gamma.toFixed(1)} / ${Math.round(r.qu_val)}</td>
                                    <td style="text-align: left; padding: 6px 10px; line-height: 1.45;">${r.formula}</td>
                                    <td>${r.fxL.toFixed(1)}</td>
                                    <td style="font-weight:bold; color:#2980b9;">${r.qusi.toFixed(1)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #f5eef8; font-weight: bold;">
                                <td colspan="6">주면마찰력 합계 (&sum;)</td>
                                <td style="color:#27ae60; font-size:1.1em;">${total_Qus.toFixed(1)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px;">
                <strong>(3) 지반에 의한 극한지지력 및 허용지지력 (Q<sub>u</sub>, Q<sub>a,soil</sub>)</strong><br>
                • 극한지지력 Q<sub>u</sub> = Q<sub>up</sub> + Q<sub>us</sub> = <strong>${Qu_total.toFixed(1)} kN</strong><br>
                • 평상시 허용지지력 (F.S = 3.0) : <strong>${Qa_soil_norm.toFixed(1)} kN</strong><br>
                • 내진시 허용지지력 (F.S = 2.0) : <strong>${Qa_soil_seis.toFixed(1)} kN</strong>
            </div>

            <div class="section-title">[검증 2] 본체부 말뚝 내하력 (재료 허용압축하중 Q<sub>as</sub>) 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height: 1.6;">
                ${qMatBaseDetailStr}<br>
                • 장경비 감소율 (&mu;) = max(0, ${L_over_D.toFixed(2)} - ${n_limit}) = <strong>${mu1.toFixed(2)} %</strong><br>
                • <strong>말뚝 내하력 Q<sub>as</sub></strong> = (1 - ${frac("&mu;", "100")}) &times; Q<sub>mat_base</sub> = <span style="color:#2980b9; font-weight:bold; font-size:1.05em;">${Qas.toFixed(1)} kN</span>
            </div>

            ${settlementHtmlStr}

            <div class="section-title">[검증 4] 말뚝기초의 수평방향 지지력 및 수평변위 상세 산정 (구조계산서 11~17p 절차)</div>
            
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>1. 수평지반반력계수 k<sub>h</sub> 산정 (도로교 표준시방서 축차계산법)</strong><br>
                &nbsp;&nbsp;• 공식: k<sub>h</sub> = k<sub>h0</sub> &times; ( ${frac("1", "0.3")} &times; B<sub>H</sub> )<sup>-3/4</sup> = { ${frac("1", "0.3")} &times; &alpha; &times; E<sub>0</sub> } &times; { ${frac("1", "0.3")} &times; (${frac("D", "&beta;")})<sup>1/2</sup> }<sup>-3/4</sup><br>
                &nbsp;&nbsp;• <strong><u>[가정값: 초기가정 &beta;<sub>0</sub> = 0.20000 m<sup>-1</sup>]</u></strong>, <strong><u>[가정값: 추정계수 &alpha; = 상시 1, 지진시 2]</u></strong><br>

                <div style="font-weight:bold; margin-top:8px; color:#2c3e50;">(1) 평상시 축차계산 과정 (&alpha; = 1)</div>
                <div class="table-container" style="margin: 5px 0;">
                    <table class="result-table" style="font-size:0.82em; text-align:center;">
                        <thead>
                            <tr style="background:#eaf2f8;">
                                <th>구분</th><th>가정 &beta;</th><th>1/&beta; (m)</th><th>N<sub>1/&beta;</sub></th><th>E<sub>0</sub> (kPa)</th><th>k<sub>h</sub> (kN/m³)</th><th>계산 &beta;</th><th>오차율(%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${horizNorm.stepsRoad.map(s => `
                                <tr>
                                    <td>${s.step}</td><td>${s.beta_in.toFixed(5)}</td><td>${s.inv_beta.toFixed(3)}</td><td>${Math.round(s.N)}</td><td>${Math.round(s.E0).toLocaleString()}</td><td>${s.kh.toFixed(1)}</td><td>${s.beta_out.toFixed(5)}</td><td>${s.err.toFixed(3)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="font-weight:bold; margin-top:8px; color:#2c3e50;">(2) 지진시 축차계산 과정 (&alpha; = 2)</div>
                <div class="table-container" style="margin: 5px 0;">
                    <table class="result-table" style="font-size:0.82em; text-align:center;">
                        <thead>
                            <tr style="background:#eaf2f8;">
                                <th>구분</th><th>가정 &beta;</th><th>1/&beta; (m)</th><th>N<sub>1/&beta;</sub></th><th>E<sub>0</sub> (kPa)</th><th>k<sub>h</sub> (kN/m³)</th><th>계산 &beta;</th><th>오차율(%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${horizSeis.stepsRoad.map(s => `
                                <tr>
                                    <td>${s.step}</td><td>${s.beta_in.toFixed(5)}</td><td>${s.inv_beta.toFixed(3)}</td><td>${Math.round(s.N)}</td><td>${Math.round(s.E0).toLocaleString()}</td><td>${s.kh.toFixed(1)}</td><td>${s.beta_out.toFixed(5)}</td><td>${s.err.toFixed(3)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>2. 수평지반반력계수 k<sub>h</sub> 산정 (후쿠오카 공식)</strong><br>
                &nbsp;&nbsp;• 공식: k<sub>h</sub> = 0.691 &times; N<sup>0.406</sup> &times; 1000 (kN/m³)<br>
                &nbsp;&nbsp;• 평상시 축차계산 최종: k<sub>h</sub> = <strong>${horizNorm.kh_fukuoka.toFixed(1)} kN/m³</strong> (&beta; = ${horizNorm.beta_fukuoka.toFixed(3)} m<sup>-1</sup>)<br>
                &nbsp;&nbsp;• 지진시 축차계산 최종: k<sub>h</sub> = <strong>${horizSeis.kh_fukuoka.toFixed(1)} kN/m³</strong> (&beta; = ${horizSeis.beta_fukuoka.toFixed(3)} m<sup>-1</sup>)<br>
                &nbsp;&nbsp;▶ <strong>최종 적용 k<sub>h</sub> (도로교 및 후쿠오카 공식 중 최소값 채택) :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 평상시: k<sub>h</sub> = <strong><span style="color:#27ae60;">${kh_norm.toFixed(1)} kN/m³</span></strong> (&beta; = ${beta_norm.toFixed(5)} m<sup>-1</sup>)<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 지진시: k<sub>h</sub> = <strong><span style="color:#27ae60;">${kh_seis.toFixed(1)} kN/m³</span></strong> (&beta; = ${beta_seis.toFixed(5)} m<sup>-1</sup>)
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>3. Broms 극한평형법 매개변수 및 말뚝 길이 조건 판정</strong><br>
                &nbsp;&nbsp;• <strong><u>[가정값: 항복휨응력 f<sub>y</sub> = 27,000 kPa]</u></strong>, <strong><u>[가정값: 하중 작용점 높이 h = 0.0 m]</u></strong><br>
                &nbsp;&nbsp;• 단면계수 (Z) = ${frac("&pi; &times; D³", "32")} = ${frac(`&pi; &times; ${D.toFixed(3)}³`, "32")} = <strong>${Z_m3.toFixed(4)} m³</strong><br>
                &nbsp;&nbsp;• 항복모멘트 (M<sub>y</sub>) = f<sub>y</sub> &times; Z = 27,000 &times; ${Z_m3.toFixed(4)} = <strong>${My_kNm.toFixed(1)} kN·m</strong><br>
                &nbsp;&nbsp;• 수동토압계수 (K<sub>p</sub>) = ${frac("1 + sin&phi;", "1 - sin&phi;")} = ${frac(`1 + sin(${topLayer.phi}°)`, `1 - sin(${topLayer.phi}°)`)} = <strong>${Kp.toFixed(3)}</strong><br>
                &nbsp;&nbsp;• 수중단위중량 (&gamma;') = &gamma;<sub>sat</sub> - &gamma;<sub>w</sub> = ${topLayer.gamma.toFixed(1)} - 9.81 = <strong><u>[가정값: ${gamma_sub.toFixed(1)} kN/m³]</u></strong><br><br>
                &nbsp;&nbsp;• <strong>말뚝 특성치 &eta; 및 &eta;L 계산 :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 평상시 1/&beta; = ${chi_norm.toFixed(3)} m, 지반반력상수 n<sub>h</sub> = ${frac("k<sub>h</sub> &times; D", "1/&beta;")} = ${frac(`${kh_norm.toFixed(1)} &times; ${D.toFixed(3)}`, chi_norm.toFixed(3))} = <strong>${eta_h_norm.toFixed(1)} kN/m³</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&eta; = ( ${frac("n<sub>h</sub>", "EI")} )<sup>1/5</sup> = ( ${frac(eta_h_norm.toFixed(1), horizNorm.EI.toFixed(1))} )<sup>1/5</sup> = <strong>${eta_norm.toFixed(3)} m<sup>-1</sup></strong> &rArr; &eta;L = ${eta_norm.toFixed(3)} &times; ${L.toFixed(1)} = <strong>${etaL_norm.toFixed(3)}</strong> ( <strong>&eta;L > 4.0 이므로 <u>긴말뚝</u> 판정</strong> )<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 지진시 1/&beta; = ${chi_seis.toFixed(3)} m, 지반반력상수 n<sub>h</sub> = ${frac("k<sub>h</sub> &times; D", "1/&beta;")} = ${frac(`${kh_seis.toFixed(1)} &times; ${D.toFixed(3)}`, chi_seis.toFixed(3))} = <strong>${eta_h_seis.toFixed(1)} kN/m³</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&eta; = ( ${frac("n<sub>h</sub>", "EI")} )<sup>1/5</sup> = ( ${frac(eta_h_seis.toFixed(1), horizSeis.EI.toFixed(1))} )<sup>1/5</sup> = <strong>${eta_seis.toFixed(3)} m<sup>-1</sup></strong> &rArr; &eta;L = ${eta_seis.toFixed(3)} &times; ${L.toFixed(1)} = <strong>${etaL_seis.toFixed(3)}</strong> ( <strong>&eta;L > 4.0 이므로 <u>긴말뚝</u> 판정</strong> )<br>
                &nbsp;&nbsp;• <strong><u>[가정값: 두부 구속조건 = ${head_cond === 'fixed' ? '두부고정' : '두부자유'}]</u></strong>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>4. Broms 극한평형법 수평 지지력 산정 수식 및 계산 과정</strong><br>
                &nbsp;&nbsp;• <strong>긴말뚝(사질토, 두부자유) 수평극한저항력 (H<sub>u</sub>) 관계식 :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;${frac("H<sub>u</sub>", "K<sub>p</sub> &gamma;' D³")} [ ${frac("h", "D")} + 0.544 { ${frac("H<sub>u</sub>", "K<sub>p</sub> &gamma;' D²")} }<sup>1/2</sup> ] = ${frac("M<sub>y</sub>", "K<sub>p</sub> &gamma;' D⁴")}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&rArr; H<sub>u</sub> = 2.38 &times; ( ${frac("M<sub>y</sub>", "K<sub>p</sub> &gamma;' D⁴")} )<sup>2/3</sup> &times; (K<sub>p</sub> &gamma;' D³)<br>
                &nbsp;&nbsp;• <strong>수치 대입 계산 :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- K<sub>p</sub> &gamma;' D³ = ${Kp.toFixed(3)} &times; ${gamma_sub.toFixed(1)} &times; ${D.toFixed(3)}³ = <strong>${Kp_gamma_D3.toFixed(1)} kN</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- K<sub>p</sub> &gamma;' D⁴ = ${Kp.toFixed(3)} &times; ${gamma_sub.toFixed(1)} &times; ${D.toFixed(3)}⁴ = <strong>${Kp_gamma_D4.toFixed(1)} kN·m</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- ${frac("M<sub>y</sub>", "K<sub>p</sub> &gamma;' D⁴")} = ${frac(My_kNm.toFixed(1), Kp_gamma_D4.toFixed(1))} = <strong>${My_ratio.toFixed(2)}</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- H<sub>u</sub> = 2.38 &times; (${My_ratio.toFixed(2)})<sup>2/3</sup> &times; ${Kp_gamma_D3.toFixed(1)} = <strong>${Hu_norm.toFixed(1)} kN/본</strong><br>
                &nbsp;&nbsp;• <strong>Broms 허용수평지지력 (H<sub>a</sub>) :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 평상시 H<sub>a</sub> = ${frac("H<sub>u</sub>", "3.0")} = ${frac(Hu_norm.toFixed(1), "3.0")} = <strong>${Ha_broms_norm.toFixed(1)} kN/본</strong> ( <strong><u>[가정값: 안전율 F.S = 3.0]</u></strong> )<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 지진시 H<sub>a</sub> = ${frac("H<sub>u</sub>", "2.0")} = ${frac(Hu_seis.toFixed(1), "2.0")} = <strong>${Ha_broms_seis.toFixed(1)} kN/본</strong> ( <strong><u>[가정값: 안전율 F.S = 2.0]</u></strong> )
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>5. Chang 탄성지반반력법 수평 지지력 산정 수식 및 계산 과정</strong><br>
                &nbsp;&nbsp;• <strong>허용변위 연동 허용수평지지력 공식 :</strong> H<sub>a</sub> = ${frac("k<sub>h</sub> &times; D &times; &delta;<sub>sa</sub>", "&beta;")}<br>
                &nbsp;&nbsp;• <strong><u>[가정값: 허용수평변위량 &delta;<sub>sa</sub> = ${allow_h_disp.toFixed(1)} mm = ${(allow_h_disp/1000).toFixed(4)} m]</u></strong><br>
                &nbsp;&nbsp;• <strong>수치 대입 계산 :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 평상시 H<sub>a</sub> = ${frac(`${kh_norm.toFixed(1)} &times; ${D.toFixed(3)} &times; ${(allow_h_disp/1000).toFixed(4)}`, beta_norm.toFixed(5))} = <strong><span style="color:#2980b9; font-weight:bold;">${Ha_chang_norm.toFixed(1)} kN/본</span></strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 지진시 H<sub>a</sub> = ${frac(`${kh_seis.toFixed(1)} &times; ${D.toFixed(3)} &times; ${(allow_h_disp/1000).toFixed(4)}`, beta_seis.toFixed(5))} = <strong><span style="color:#2980b9; font-weight:bold;">${Ha_chang_seis.toFixed(1)} kN/본</span></strong>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>6. 수평 허용지지력 결과 비교 및 최종 적용값</strong><br>
                <div class="table-container" style="margin: 5px 0;">
                    <table class="result-table" style="font-size:0.88em; text-align:center;">
                        <thead>
                            <tr style="background:#e8f8f5;">
                                <th>구분</th><th>Broms법 H<sub>a</sub> (kN)</th><th>Chang법 H<sub>a</sub> (kN)</th><th>최종 적용 H<sub>a</sub> (kN)</th><th>작용 수평력 H (kN)</th><th>판정</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>평상시</td><td>${Ha_broms_norm.toFixed(1)}</td><td>${Ha_chang_norm.toFixed(1)}</td><td style="font-weight:bold; color:#27ae60;">${Ha_app_norm.toFixed(1)}</td><td>${H_norm.toFixed(1)}</td><td style="font-weight:bold; color:${H_norm <= Ha_app_norm ? '#27ae60' : '#c0392b'};">${h_status_norm}</td>
                            </tr>
                            <tr>
                                <td>지진시</td><td>${Ha_broms_seis.toFixed(1)}</td><td>${Ha_chang_seis.toFixed(1)}</td><td style="font-weight:bold; color:#27ae60;">${Ha_app_seis.toFixed(1)}</td><td>${H_seis.toFixed(1)}</td><td style="font-weight:bold; color:${H_seis <= Ha_app_seis ? '#27ae60' : '#c0392b'};">${h_status_seis}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>7. Chang 탄성식에 의한 지표면 수평발생변위량 (&delta;) 산정 및 검토</strong><br>
                &nbsp;&nbsp;• <strong>지표면 변위 산정 공식 :</strong> &delta; = ${frac("H &times; &beta;", "k<sub>h</sub> &times; D")} &times; 1000 (mm)<br>
                &nbsp;&nbsp;• <strong>수치 대입 계산 :</strong><br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 평상시 발생변위 &delta;<sub>norm</sub> = ${frac(`${H_norm.toFixed(1)} &times; ${beta_norm.toFixed(5)}`, `${kh_norm.toFixed(1)} &times; ${D.toFixed(3)}`)} &times; 1000 = <strong><span style="color:#d35400; font-weight:bold;">${disp_norm_mm.toFixed(2)} mm</span></strong> &le; ${allow_h_disp.toFixed(1)} mm ( <strong>${disp_status_norm}</strong> )<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- 지진시 발생변위 &delta;<sub>seis</sub> = ${frac(`${H_seis.toFixed(1)} &times; ${beta_seis.toFixed(5)}`, `${kh_seis.toFixed(1)} &times; ${D.toFixed(3)}`)} &times; 1000 = <strong><span style="color:#d35400; font-weight:bold;">${disp_seis_mm.toFixed(2)} mm</span></strong> &le; ${allow_h_disp.toFixed(1)} mm ( <strong>${disp_status_seis}</strong> )
            </div>
        `;
    }
}
