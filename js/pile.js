export function initPileModule(container) {
    const getVal = (id, defaultVal) => {
        try {
            return localStorage.getItem('geo_pile_' + id) ?? defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

    const frac = (num, den) => `<span style="display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; margin:0 4px;"><span style="border-bottom:1px solid #2c3e50; padding:1px 4px;">${num}</span><span style="padding:1px 4px;">${den}</span></span>`;

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

    let initialType = getVal('type', 'PHC');
    if (initialType !== 'PHC' && initialType !== 'STEEL') initialType = 'PHC';

    const initialT1 = parseFloat(getVal('t1', '1.0')).toFixed(1);
    const initialMethod = getVal('method', 'bored');
    const initialGWT = getVal('gwt', '2.0');
    const cpType = getVal('Cp_type', 'avg');
    const defaultEp = initialType === 'STEEL' ? '200000000' : '39200000';

    container.innerHTML = `
        <h3>1. 설계자료 입력 (기성말뚝 지지력 및 침하량 검토)</h3>
        
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 말뚝기초 제원 및 시공 조건</div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px;">
            <div class="input-group" style="margin:0;">
                <label>말뚝 종류</label>
                <select id="pile_type" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.88em;">
                    <option value="PHC" ${initialType === 'PHC' ? 'selected' : ''}>PHC 말뚝</option>
                    <option value="STEEL" ${initialType === 'STEEL' ? 'selected' : ''}>강관 말뚝</option>
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

        <div id="pile_row2_container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px;"></div>
        <div id="formula_info_box" style="margin-bottom: 15px; font-size: 0.83em; color: #2c3e50; background: #f4f6f7; padding: 8px 12px; border-radius: 4px; border-left: 4px solid #16a085;"></div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400; font-size: 0.95em;">■ 작용 하중 (상부구조 반력)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99;">
            <div class="input-group" style="background:#fff;">
                <label style="color:#d35400;">평상시 P<sub>norm</sub> (kN/본)</label>
                <input type="number" id="pile_P_norm" value="${getVal('P_norm', '2062.8')}" step="0.1">
            </div>
            <div class="input-group" style="background:#fff;">
                <label style="color:#c0392b;">내진시 P<sub>seis</sub> (kN/본)</label>
                <input type="number" id="pile_P_seis" value="${getVal('P_seis', '1728.6')}" step="0.1">
            </div>
        </div>

        <div id="pile_settlement_input_sec">
            <div style="font-weight: bold; margin-bottom: 8px; color: #8e44ad; font-size: 0.95em;">■ 침하량 산정 조건 (Vesic 및 CFEM)</div>
            <div class="input-grid" style="margin-bottom: 15px; background-color: #f5eef8; padding: 10px; border-radius: 5px; border: 1px solid #d7bde2;">
                <div class="input-group" style="background:#fff;">
                    <label style="color:#8e44ad;">말뚝 탄성계수 E<sub>p</sub> (kN/m²)</label>
                    <input type="number" id="pile_Ep" value="${getVal('Ep', defaultEp)}" step="100000">
                </div>
                <div class="input-group" style="background:#fff;">
                    <label>주면마찰 분포계수 &alpha;<sub>s</sub></label>
                    <select id="pile_alpha_s" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.9em; text-align:center;">
                        <option value="0.50" ${getVal('alpha_s', '0.67') === '0.50' ? 'selected' : ''}>0.50 (균등/포물선)</option>
                        <option value="0.67" ${getVal('alpha_s', '0.67') === '0.67' ? 'selected' : ''}>0.67 (삼각형)</option>
                    </select>
                </div>
                <div class="input-group" style="background:#fff;">
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
                <div class="input-group" style="background:#fff;">
                    <label style="color:#d35400;">허용 침하량 (mm)</label>
                    <input type="number" id="pile_allow_settle" value="${getVal('allow_settle', '25.0')}" step="0.1">
                </div>
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
                            <th style="width: 19%; padding: 6px;">점착력 c (kPa)</th>
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

        <button type="button" class="action-btn" id="calc-pile-btn" style="margin-top: 10px; cursor: pointer;">기성말뚝 연직지지력 및 침하량 산정</button>
        <div id="pile-result" class="result-box" style="display: none;"></div>
    `;

    function updateFormulaInfoText() {
        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qpVal = container.querySelector('#pile_qp_formula')?.value || 'road';
        const qsVal = container.querySelector('#pile_qs_formula')?.value || 'road';
        const infoBox = container.querySelector('#formula_info_box');

        if (!infoBox) return;

        let qpText = "";
        let qsText = "";

        if (method === 'driven') {
            qpText = "300 &times; N (N&le;60)";
            if (qsVal === 'lh') qsText = "2.0 &times; N (사질토), 5.0 &times; q<sub>u</sub> (점성토)";
            else qsText = "2.0 &times; N (사질토, 상한 100 kN/m²), 1.0 &times; c<sub>u</sub> (점성토, 상한 100 kN/m²)";
        } else {
            if (qpVal === 'lh') qpText = "250 &times; N (N&le;60)";
            else qpText = "200 &times; N (사질토, 상한 12,000 kN/m²), 6 &times; c<sub>u</sub> (점성토, 상한 12,000 kN/m²)";
            if (qsVal === 'lh') qsText = "2.0 &times; N (사질토), 5.0 &times; q<sub>u</sub> (점성토)";
            else qsText = "2.5 &times; N (사질토, N&le;50), 0.8 &times; c<sub>u</sub> (점성토, c<sub>u</sub>&le;125 kN/m²)";
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
        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qpSelect = container.querySelector('#pile_qp_formula');
        const qsSelect = container.querySelector('#pile_qs_formula');
        if (!qpSelect) return;

        const savedQp = getVal('qp_formula', 'road');
        const savedQs = getVal('qs_formula', 'road');

        if (method === 'driven') {
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
        const specSelect = container.querySelector('#pile_spec_select');
        const row2Container = container.querySelector('#pile_row2_container');
        const epInput = container.querySelector('#pile_Ep');

        if (!specSelect || !grid2Content || !row2Container) return;

        if (epInput) {
            epInput.value = type === 'STEEL' ? '200000000' : '39200000';
            try { localStorage.setItem('geo_pile_Ep', epInput.value); } catch(e){}
        }

        specSelect.innerHTML = '';
        row2Container.style.gridTemplateColumns = 'repeat(4, 1fr)';

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
                    <input type="number" id="pile_t1" value="${initialT1}" step="0.1" placeholder="t1" style="width:48px; text-align:center; box-sizing:border-box; padding:2px; border:1px solid #ccc; font-size:0.85em;">
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
            const nextIdx = pileLayers.length + 1;
            pileLayers.push({ name: `지층${nextIdx}`, type: 'sand', dz: 3.0, n_val: 30, gamma: 19.0, c_val: 0 });
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
        } else if (e.target.id === 'grid5_val') {
            try { localStorage.setItem('geo_pile_grid5_val', e.target.value); } catch(err){}
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

        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qp_formula_key = container.querySelector('#pile_qp_formula').value;
        const qs_formula_key = container.querySelector('#pile_qs_formula')?.value || 'road';

        const qpSelectElem = container.querySelector('#pile_qp_formula');
        const qp_formula_name = qpSelectElem ? qpSelectElem.options[qpSelectElem.selectedIndex]?.text : '';

        const qsSelectElem = container.querySelector('#pile_qs_formula');
        const qs_formula_name = qsSelectElem ? qsSelectElem.options[qsSelectElem.selectedIndex]?.text : '';

        const D_mm = parseFloat(container.querySelector('#pile_D').value) || 500;
        const D = D_mm / 1000.0;
        const t_mm = parseFloat(container.querySelector('#pile_t').value) || 0;
        const grid5Val = parseFloat(container.querySelector('#grid5_val').value) || 0;

        let t1_mm = 0;
        if (p_type === 'STEEL') {
            const t1Elem = container.querySelector('#pile_t1');
            if (t1Elem) t1_mm = parseFloat(t1Elem.value) || 0;
        }

        const L = pileLayersData.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);
        const joint_type = container.querySelector('#pile_joint_type')?.value || 'none';
        const joint_cnt = parseInt(container.querySelector('#pile_joint_count')?.value) || 0;

        const P_norm = parseFloat(container.querySelector('#pile_P_norm').value) || 0;
        const P_seis = parseFloat(container.querySelector('#pile_P_seis').value) || 0;

        let lastLayer = pileLayersData.length > 0 ? pileLayersData[pileLayersData.length - 1] : { name: '지지층', type: 'sand', n_val: 50, gamma: 20.0, c_val: 0 };
        let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
        let c_tip = parseFloat(lastLayer.c_val) || 0;
        const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
        
        let q_p = 0; 

        if (method === 'driven') {
            let N_used = Math.min(raw_N_tip, 60);
            q_p = 300.0 * N_used;
        } else {
            if (qp_formula_key === 'lh') {
                let N_used = Math.min(raw_N_tip, 60);
                q_p = 250.0 * N_used;
            } else {
                let isGranular = ['sand', 'gravel', 'weathered_rock'].includes(lastLayer.type);
                if (isGranular) {
                    q_p = Math.min(200.0 * raw_N_tip, 12000.0);
                } else {
                    q_p = Math.min(6.0 * c_tip, 12000.0);
                }
            }
        }

        const Qup = q_p * Ap;

        const As = Math.PI * D;
        let total_Qus = 0;

        let c_factor = (method === 'driven') ? 2.0 : (qs_formula_key === 'lh' ? 2.0 : 2.5);
        let c_factor_c = (method === 'driven') ? 1.0 : (qs_formula_key === 'lh' ? 5.0 : 0.8);

        pileLayersData.forEach(l => {
            let f_unit = 0;
            let dz_i = parseFloat(l.dz) || 0;
            let c_val_i = parseFloat(l.c_val) || 0; 

            let isGranular = ['sand', 'gravel', 'weathered_rock'].includes(l.type);
            if (isGranular) {
                f_unit = Math.min(100.0, c_factor * l.n_val);
            } else {
                f_unit = Math.min(100.0, c_factor_c * c_val_i);
            }

            total_Qus += f_unit * dz_i * As;
        });

        const Qu_total = Qup + total_Qus;
        const Qa_soil_norm = Qu_total / 3.0;
        const Qa_soil_seis = Qu_total / 2.0;

        let Q_mat_base = 0;
        let A_net = 0;

        if (p_type === 'PHC') {
            A_net = Ap;
            Q_mat_base = grid5Val;
        } else if (p_type === 'STEEL') {
            let D_out = D - (t1_mm / 1000.0);
            let D_in = Math.max(0, D_out - 2.0 * (t_mm / 1000.0));
            A_net = (Math.PI * (Math.pow(D_out, 2) - Math.pow(D_in, 2))) / 4.0;
            Q_mat_base = grid5Val * A_net;
        }

        const L_over_D = L / D;
        let n_limit = 85;
        let mu1 = Math.max(0, L_over_D - n_limit);
        let mu2 = (method === 'bored') ? ((joint_type === 'weld' ? 5.0 : (joint_type === 'bolt' ? 10.0 : 0.0)) * 0.5 * joint_cnt) : ((joint_type === 'weld' ? 5.0 : (joint_type === 'bolt' ? 10.0 : 0.0)) * joint_cnt);
        const Qas = (1.0 - (mu1 + mu2) / 100.0) * Q_mat_base;

        const Q_app_norm = Math.min(Qa_soil_norm, Qas);
        const Q_app_seis = Math.min(Qa_soil_seis, Qas);

        let Cp_min = 0, Cp_max = 0, Cp_avg = 0;
        let soilLabel = "", methodLabel = (method === 'driven') ? "타입말뚝" : "굴착말뚝";
        let isClay = lastLayer.type === 'clay';

        if (isClay) {
            soilLabel = "점토";
            if (method === 'driven') { Cp_min = 0.02; Cp_max = 0.03; }
            else { Cp_min = 0.03; Cp_max = 0.06; }
        } else {
            soilLabel = "모래";
            if (method === 'driven') { Cp_min = 0.02; Cp_max = 0.04; }
            else { Cp_min = 0.09; Cp_max = 0.18; }
        }
        Cp_avg = (Cp_min + Cp_max) / 2.0;

        let Ep = parseFloat(container.querySelector('#pile_Ep')?.value) || (p_type === 'STEEL' ? 200000000 : 39200000);
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

        let Ss_norm_mm = (A_net > 0 && Ep > 0) ? (((Qpa_norm + alpha_s * Qfs_norm) * L) / (A_net * Ep) * 1000) : 0;
        let Sp_norm_mm = (D > 0 && q_p > 0) ? ((Cp * Qpa_norm) / (D * q_p) * 1000) : 0;
        let Cs = (0.93 + 0.16 * Math.sqrt(L / D)) * Cp;
        let Sps_norm_mm = (L > 0 && q_p > 0) ? ((Cs * Qfs_norm) / (L * q_p) * 1000) : 0;
        let S_vesic_norm = Ss_norm_mm + Sp_norm_mm + Sps_norm_mm;

        let Ss_seis_mm = (A_net > 0 && Ep > 0) ? (((Qpa_seis + alpha_s * Qfs_seis) * L) / (A_net * Ep) * 1000) : 0;
        let Sp_seis_mm = (D > 0 && q_p > 0) ? ((Cp * Qpa_seis) / (D * q_p) * 1000) : 0;
        let Sps_seis_mm = (L > 0 && q_p > 0) ? ((Cs * Qfs_seis) / (L * q_p) * 1000) : 0;
        let S_vesic_seis = Ss_seis_mm + Sp_seis_mm + Sps_seis_mm;

        let term1_cfem_mm = (D / 100) * 1000;
        let term2_cfem_norm_mm = (A_net > 0 && Ep > 0) ? ((P_norm * L) / (A_net * Ep) * 1000) : 0;
        let S_cfem_norm = term1_cfem_mm + term2_cfem_norm_mm;

        let term2_cfem_seis_mm = (A_net > 0 && Ep > 0) ? ((P_seis * L) / (A_net * Ep) * 1000) : 0;
        let S_cfem_seis = term1_cfem_mm + term2_cfem_seis_mm;

        const status_p_norm = P_norm <= Q_app_norm ? '안정 (O.K)' : 'NG';
        const status_p_seis = P_seis <= Q_app_seis ? '안정 (O.K)' : 'NG';
        const status_s_norm = S_vesic_norm <= allow_settle ? '안정 (O.K)' : 'NG';
        const status_s_seis = S_vesic_seis <= allow_settle ? '안정 (O.K)' : 'NG';

        const summaryRowsHtml = `
            <tr>
                <td rowspan="2" style="background:#eaf2f8; font-weight:bold;">지지력 검토</td>
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
            <div class="section-title">[기성말뚝 지지력 및 침하량 종합 검토 요약]</div>
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
                • 지지층 : <strong>${lastLayer.name}</strong> (N = ${raw_N_tip}, c = ${c_tip} kPa)<br>
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

            <div class="section-title">[검증 2] 말뚝 연직침하량 산정 상세 (Vesic 및 CFEM)</div>
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
