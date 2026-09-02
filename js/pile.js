// pile.js (기성말뚝 전용: PHC 말뚝 및 강관 말뚝)

export function initPileModule(container) {
    const getVal = (id, defaultVal) => {
        try {
            return localStorage.getItem('geo_pile_' + id) ?? defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

    // 천 단위 콤마 포맷팅 유틸리티
    const parseNum = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(val.toString().replace(/,/g, '')) || 0;
    };

    const formatComma = (val, decimals = -1) => {
        let num = parseNum(val);
        if (isNaN(num)) return '';
        if (decimals >= 0) {
            let parts = num.toFixed(decimals).split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return parts.join('.');
        } else {
            let str = val.toString().replace(/,/g, '');
            let parts = str.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return parts.join('.');
        }
    };

    // 분수 시각화 유틸리티
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

    let savedD = parseNum(getVal('D', '500'));
    if (savedD < 10) savedD = savedD * 1000;

    let pileLayers;
    try {
        pileLayers = JSON.parse(localStorage.getItem('geo_pile_layers'));
    } catch (e) {
        pileLayers = null;
    }

    if (!pileLayers || !Array.isArray(pileLayers) || pileLayers.length === 0) {
        pileLayers = [
            { name: '지층1', type: 'clay', dz: 5.0, n_val: 15, gamma: 18.0, c_val: 20.0, phi_val: 0.0, es_val: 10000, qu_val: 40 },
            { name: '지층2', type: 'sand', dz: 10.0, n_val: 25, gamma: 19.0, c_val: 0.0, phi_val: 30.0, es_val: 25000, qu_val: 0 },
            { name: '지층3', type: 'weathered_soil', dz: 15.0, n_val: 50, gamma: 20.0, c_val: 10.0, phi_val: 35.0, es_val: 40000, qu_val: 0 }
        ];
        try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch (e) {}
    }

    const calcTotalL = () => pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

    const initialType = getVal('type', 'PHC');
    const initialT1 = parseFloat(getVal('t1', '1.0')).toFixed(1);
    const initialMethod = getVal('method', 'bored');
    const initialGWT = getVal('gwt', '2.0');
    const cpType = getVal('Cp_type', 'avg');
    const defaultEp = initialType === 'STEEL' ? '200,000,000' : '39,200,000';

    container.innerHTML = `
        <style>
            .pl-input::-webkit-outer-spin-button, .pl-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            .pl-input { -moz-appearance: textfield; width: 100%; box-sizing: border-box; padding: 4px 2px; text-align: center; border: 1px solid #ccc; border-radius: 3px; font-size: 0.88em; }
            .pl-input:focus { border-color: #2980b9; outline: none; }
            .pl-select { width: 100%; box-sizing: border-box; padding: 4px 0px; text-align: center; text-align-last: center; border: 1px solid #ccc; border-radius: 3px; font-size: 0.88em; margin: 0; }
        </style>

        <h3>기성말뚝 기초 검토 (PHC / 강관말뚝)</h3>
        
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
                    <input type="text" id="pile_D" value="${formatComma(savedD)}" placeholder="D(mm)" class="pl-input comma-input" style="width:45%; height:100%;">
                </div>
            </div>
            <div class="input-group" style="margin:0;">
                <label>두께 선택 / 두께 t (mm)</label>
                <div style="display:flex; gap:4px; height:32px;">
                    <select id="pile_t_select" style="width:55%; height:100%; box-sizing:border-box; padding:2px; font-size:0.85em;"></select>
                    <input type="text" id="pile_t" value="${getVal('t', '80')}" class="pl-input" style="width:45%; height:100%;">
                </div>
            </div>
            <div class="input-group" style="margin:0;">
                <label id="grid5_label" style="font-size: 0.78em; white-space: nowrap;">허용축하중 P<sub>a</sub> (kN)</label>
                <input type="text" id="grid5_val" value="${formatComma(getVal('grid5_val', '1,730'))}" class="pl-input comma-input" style="height:32px; font-weight:bold;">
            </div>
        </div>

        <div id="pile_row2_container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px;"></div>
        <div id="formula_info_box" style="margin-bottom: 15px; font-size: 0.83em; color: #2c3e50; background: #f4f6f7; padding: 8px 12px; border-radius: 4px; border-left: 4px solid #16a085;"></div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400; font-size: 0.95em;">■ 작용 하중 (상부구조 반력)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#d35400;">평상시 P<sub>norm</sub> (kN/본)</label><input type="text" id="pile_P_norm" value="${formatComma(getVal('P_norm', '2,062.8'))}" class="pl-input comma-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#c0392b;">지진시 P<sub>seis</sub> (kN/본)</label><input type="text" id="pile_P_seis" value="${formatComma(getVal('P_seis', '1,728.6'))}" class="pl-input comma-input"></div>
        </div>

        <div id="pile_settlement_input_sec">
            <div style="font-weight: bold; margin-bottom: 8px; color: #8e44ad; font-size: 0.95em;">■ 침하량 산정 조건 (Vesic 및 CFEM - 기성말뚝)</div>
            <div class="input-grid" style="margin-bottom: 15px; background-color: #f5eef8; padding: 10px; border-radius: 5px; border: 1px solid #d7bde2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                <div class="input-group" style="background:#fff; margin:0;"><label style="color:#8e44ad;">말뚝 탄성계수 E<sub>p</sub> (kPa)</label><input type="text" id="pile_Ep" value="${formatComma(getVal('Ep', defaultEp))}" class="pl-input comma-input"></div>
                <div class="input-group" style="background:#fff; margin:0;">
                    <label>주면마찰 분포계수 &alpha;<sub>s</sub></label>
                    <select id="pile_alpha_s" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.9em; text-align:left; text-align-last:left;">
                        <option value="0.50" ${getVal('alpha_s', '0.67') === '0.50' ? 'selected' : ''}>0.50 (균등 및 포물선)</option>
                        <option value="0.67" ${getVal('alpha_s', '0.67') === '0.67' ? 'selected' : ''}>0.67 (삼각형)</option>
                    </select>
                </div>
                <div class="input-group" style="background:#fff; margin:0;">
                    <label>경험계수 C<sub>p</sub> 산정방식</label>
                    <div style="display:flex; gap:4px; height:32px;">
                        <select id="pile_Cp_type" style="flex:1; height:100%; box-sizing:border-box; padding:2px; font-size:0.85em; text-align:left; text-align-last:left;">
                            <option value="avg" ${cpType === 'avg' ? 'selected' : ''}>평균 적용</option>
                            <option value="min" ${cpType === 'min' ? 'selected' : ''}>최소 적용</option>
                            <option value="max" ${cpType === 'max' ? 'selected' : ''}>최대 적용</option>
                            <option value="custom" ${cpType === 'custom' ? 'selected' : ''}>직접입력</option>
                        </select>
                        <input type="number" id="pile_Cp_custom" value="${getVal('Cp_custom', '0.135')}" step="0.001" class="pl-input" style="width:45%; height:100%; ${cpType === 'custom' ? 'display:block;' : 'display:none;'}">
                    </div>
                </div>
                <div class="input-group" style="background:#fff; margin:0;"><label style="color:#d35400;">허용 침하량 (mm)</label><input type="text" id="pile_allow_settle" value="${formatComma(parseNum(getVal('allow_settle', '25.0')), 1)}" class="pl-input dec-input"></div>
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-weight: bold; color: #27ae60; font-size: 0.95em;">■ 지층 정보</span>
                <div style="display: flex; align-items: center; gap: 5px; font-size: 0.85em; background: #eaf2f8; padding: 2px 8px; border-radius: 4px; border: 1px solid #aeb6bf;">
                    <label for="pile_gwt" style="font-weight: bold;">지하수위 GWT (GL. -m):</label>
                    <input type="number" id="pile_gwt" value="${initialGWT}" step="0.1" style="width: 55px; height: 22px; text-align: center; border: 1px solid #ccc; font-weight: bold;">
                </div>
            </div>
            <button type="button" id="pile_layer_add" style="padding: 4px 10px; background: #27ae60; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85em; font-weight: bold;">+ 지층 추가</button>
        </div>
        
        <div style="background-color: #e8f8f5; padding: 8px; border-radius: 6px; border: 1px solid #a3e4d7; margin-bottom: 15px;">
            <div class="table-container" style="margin: 0; overflow-x: auto;">
                <table class="result-table" style="font-size: 0.82em; text-align: center; margin: 0; width: 100%;">
                    <thead>
                        <tr style="background-color: #d1f2eb;">
                            <th style="width:11%;">지층명</th>
                            <th style="width:12%;">토성구분</th>
                            <th style="width:9%;">층후 L (m)</th>
                            <th style="width:8%;">N치</th>
                            <th style="width:11%;">단위중량 &gamma;<br>(kN/m³)</th>
                            <th style="width:11%;">점착력 c<br>(kPa)</th>
                            <th style="width:11%;">내부마찰각 &phi;<br>(&deg;)</th>
                            <th style="width:12%;">변형계수 E<sub>s</sub><br>(kPa)</th>
                            <th style="width:11%;">일축압축강도 q<sub>u</sub><br>(kPa)</th>
                            <th style="width:4%;">삭제</th>
                        </tr>
                    </thead>
                    <tbody id="pile_layers_body"></tbody>
                    <tfoot>
                        <tr style="background-color: #ebf5fb; font-weight: bold; border-top: 2px solid #a3e4d7;">
                            <td colspan="2" style="text-align: right; color: #2980b9;">말뚝 총 길이 L (m) :</td>
                            <td id="pile_L_val" style="color: #16a085; font-size: 1.05em;">${calcTotalL().toFixed(1)}</td>
                            <td colspan="7" style="text-align: left; color: #7f8c8d; padding-left:10px;">(지층 층후 자동 합산)</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <button type="button" class="action-btn" id="calc-pile-btn" style="margin-top: 10px; cursor: pointer;">기성말뚝 연직지지력 및 침하량 종합산정</button>
        <div id="pile-result" class="result-box" style="display: none;"></div>
    `;

    // 콤마 입력 실시간 제어
    container.addEventListener('input', (e) => {
        if (e.target.classList.contains('comma-input')) {
            let rawVal = e.target.value.replace(/,/g, '');
            if (!isNaN(parseFloat(rawVal)) || rawVal === '' || rawVal === '.') {
                e.target.value = formatComma(rawVal);
            }
        }
    });

    // 지층 정보 Tab 이동: 행 이동 후 최하단에서 오른쪽 열의 최상단으로 이동
    container.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            const target = e.target;
            if (target.classList.contains('pl-input') || target.classList.contains('pl-select')) {
                const cell = target.closest('td');
                const row = target.closest('tr');
                if (cell && row && row.parentElement.id === 'pile_layers_body') {
                    const colIdx = Array.from(row.children).indexOf(cell);
                    const nextRow = row.nextElementSibling;
                    if (nextRow) {
                        const targetCell = nextRow.children[colIdx];
                        const targetInput = targetCell ? targetCell.querySelector('input, select') : null;
                        if (targetInput) {
                            e.preventDefault();
                            targetInput.focus();
                            if (targetInput.select) targetInput.select();
                        }
                    } else {
                        // 최하단 행에 도달 시 오른쪽 다음 열의 최상단(첫 번째 행)으로 이동
                        const tbody = row.parentElement;
                        const firstRow = tbody.firstElementChild;
                        if (firstRow) {
                            let nextColIdx = colIdx + 1;
                            if (nextColIdx < firstRow.children.length - 1) { // 삭제 버튼 열 제외
                                const targetCell = firstRow.children[nextColIdx];
                                const targetInput = targetCell ? targetCell.querySelector('input, select') : null;
                                if (targetInput) {
                                    e.preventDefault();
                                    targetInput.focus();
                                    if (targetInput.select) targetInput.select();
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    function updateFormulaInfoText() {
        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qpVal = container.querySelector('#pile_qp_formula')?.value || 'road';
        const qsVal = container.querySelector('#pile_qs_formula')?.value || 'road';
        const infoBox = container.querySelector('#formula_info_box');

        if (!infoBox) return;

        let qpText = "";
        let qsText = "";

        if (method === 'driven') {
            qpText = "q<sub>p</sub> = 300 &times; N (N &le; 60) [항타공법 표준식]";
            if (qsVal === 'lh') {
                qsText = "f<sub>s</sub> = 2.0 &times; N (사질토, N&le;50), 5.0 &times; q<sub>u</sub> (점성토, q<sub>u</sub>=2c<sub>u</sub>&le;250 kPa) [LH 말뚝기초 설계개선지침 (2008)]";
            } else {
                qsText = "f<sub>s</sub> = 2.0 &times; N (사질토, 상한 100 kPa), 1.0 &times; c<sub>u</sub> (점성토, 상한 100 kPa) [도로교설계기준해설 (2008)]";
            }
        } else {
            if (qpVal === 'lh') {
                qpText = "q<sub>p</sub> = 250 &times; N (N &le; 60) [LH 말뚝기초 설계개선지침 (2008)]";
            } else {
                qpText = "q<sub>p</sub> = min(200 &times; N, 12,000) (사질토), min(6 &times; c<sub>u</sub>, 12,000) (점성토) [도로교설계기준해설 (2008)]";
            }

            if (qsVal === 'lh') {
                qsText = "f<sub>s</sub> = 2.0 &times; N (사질토, N&le;50), 5.0 &times; q<sub>u</sub> (점성토, q<sub>u</sub>=2c<sub>u</sub>&le;250 kPa) [LH 말뚝기초 설계개선지침 (2008)]";
            } else {
                qsText = "f<sub>s</sub> = 2.5 &times; N (사질토, N&le;50), 0.8 &times; c<sub>u</sub> (점성토, c<sub>u</sub>&le;125 kPa) [도로교설계기준해설 (2008)]";
            }
        }

        infoBox.innerHTML = `
            <div style="font-weight: bold; color: #16a085;">▶ 적용 산정식 개요 (기성말뚝)</div>
            <div style="margin-left: 6px; line-height: 1.5;">
                • <strong>선단지지력 :</strong> ${qpText}<br>
                • <strong>주면마찰력 :</strong> ${qsText}<br>
                • <strong>연직 침하량 :</strong> 반경험적(Vesic, 1977) 및 경험적(CFEM, 1992) 방법
            </div>
        `;
    }

    function updateMethodFormulas() {
        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qpSelect = container.querySelector('#pile_qp_formula');
        const qsSelect = container.querySelector('#pile_qs_formula');
        if (!qpSelect || !qsSelect) return;

        const savedQp = getVal('qp_formula', 'road');
        const savedQs = getVal('qs_formula', 'road');

        if (method === 'driven') {
            qpSelect.innerHTML = `<option value="driven_standard" selected>항타공법 표준식 (300N)</option>`;
            qpSelect.disabled = true;
            qsSelect.innerHTML = `
                <option value="road" ${savedQs === 'road' ? 'selected' : ''}>도로교설계기준해설 (2008)</option>
                <option value="lh" ${savedQs === 'lh' ? 'selected' : ''}>LH 말뚝기초 설계개선지침 (2008)</option>
            `;
        } else {
            qpSelect.disabled = false;
            qpSelect.innerHTML = `
                <option value="road" ${savedQp === 'road' ? 'selected' : ''}>도로교설계기준해설 (2008)</option>
                <option value="lh" ${savedQp === 'lh' ? 'selected' : ''}>LH 말뚝기초 설계개선지침 (2008)</option>
            `;
            qsSelect.disabled = false;
            qsSelect.innerHTML = `
                <option value="road" ${savedQs === 'road' ? 'selected' : ''}>도로교설계기준해설 (2008)</option>
                <option value="lh" ${savedQs === 'lh' ? 'selected' : ''}>LH 말뚝기초 설계개선지침 (2008)</option>
            `;
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
            epInput.value = type === 'STEEL' ? '200,000,000' : '39,200,000';
        }

        if (type === 'PHC') {
            grid2Label.textContent = 'PHC 종 구분';
            grid2Content.innerHTML = `<select id="phc_class" style="width:100%; height:100%; padding:4px;"><option value="A">A종</option><option value="B">B종</option><option value="C">C종</option></select>`;
            grid5Label.innerHTML = '허용축하중 P<sub>a</sub> (kN)';
            specSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            Object.keys(PHC_DB).forEach(d => { specSelect.innerHTML += `<option value="${d}">D${d}</option>`; });
            specSelect.value = '500';

            row2Container.innerHTML = `
                <div class="input-group" style="margin:0;"><label>선단지지력 산정식</label><select id="pile_qp_formula" style="width: 100%; height: 32px; padding: 4px;"></select></div>
                <div class="input-group" style="margin:0;"><label>주면마찰력 산정식</label><select id="pile_qs_formula" style="width: 100%; height: 32px; padding: 4px;"></select></div>
                <div class="input-group" style="margin:0;"><label>시공 공법</label><select id="pile_method" style="width: 100%; height: 32px; padding: 4px;"><option value="bored" selected>굴착말뚝(매입)</option><option value="driven">타입말뚝(항타)</option></select></div>
                <div class="input-group" style="margin:0;"><label>이음 방법 및 개소</label>
                    <div style="display:flex; gap:4px; height: 32px; align-items:center;">
                        <select id="pile_joint_type" style="flex:1; height:100%; padding:2px;"><option value="weld">용접 이음</option><option value="bolt">볼트 이음</option><option value="none" selected>이음 없음</option></select>
                        <input type="number" id="pile_joint_count" value="0" min="0" class="pl-input" style="width:40px; height:100%;">
                    </div>
                </div>
            `;
        } else {
            grid2Label.textContent = '강종 / 부식두께(mm)';
            grid2Content.innerHTML = `
                <div style="display:flex; gap:3px; width:100%; height:100%;">
                    <select id="steel_grade" style="flex:1; padding:2px;"><option value="STP275">STP 275</option><option value="STP355">STP 355</option><option value="STP380">STP 380</option><option value="STP550">STP 550</option></select>
                    <input type="number" id="pile_t1" value="${initialT1}" step="0.1" class="pl-input" style="width:48px;">
                </div>
            `;
            grid5Label.innerHTML = '허용압축응력 &sigma;<sub>ca</sub> (kPa)';
            specSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            Object.keys(STEEL_DB).forEach(d => { specSelect.innerHTML += `<option value="${d}">D${STEEL_DB[d].displayD}</option>`; });
            specSelect.value = '508.0';

            row2Container.innerHTML = `
                <div class="input-group" style="margin:0;"><label>선단지지력 산정식</label><select id="pile_qp_formula" style="width: 100%; height: 32px; padding: 4px;"></select></div>
                <div class="input-group" style="margin:0;"><label>주면마찰력 산정식</label><select id="pile_qs_formula" style="width: 100%; height: 32px; padding: 4px;"></select></div>
                <div class="input-group" style="margin:0;"><label>시공 공법</label><select id="pile_method" style="width: 100%; height: 32px; padding: 4px;"><option value="bored" ${initialMethod === 'bored' ? 'selected' : ''}>굴착말뚝(매입)</option><option value="driven" ${initialMethod === 'driven' ? 'selected' : ''}>타입말뚝(항타)</option></select></div>
                <div class="input-group" style="margin:0;"><label>이음 방법 및 개소</label>
                    <div style="display:flex; gap:4px; height: 32px; align-items:center;">
                        <select id="pile_joint_type" style="flex:1; height:100%; padding:2px;"><option value="weld">용접 이음</option><option value="bolt">볼트 이음</option><option value="none" selected>이음 없음</option></select>
                        <input type="number" id="pile_joint_count" value="0" min="0" class="pl-input" style="width:40px; height:100%;">
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

        if (specVal === 'direct') {
            if (dInput) dInput.readOnly = false;
            tSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            if (tInput) tInput.readOnly = false;
            return;
        }

        if (type === 'PHC') {
            const data = PHC_DB[specVal];
            if (data) {
                if (dInput) { dInput.value = formatComma(Math.round(parseFloat(specVal))); dInput.readOnly = true; }
                tSelect.innerHTML = `<option value="direct">직접 입력</option><option value="${data.t}">${data.t}mm</option>`;
                tSelect.value = data.t.toString();
                if (tInput) { tInput.value = data.t; tInput.readOnly = true; }
                const phcClass = container.querySelector('#phc_class')?.value || 'A';
                if (grid5Val) grid5Val.value = formatComma(data[phcClass] || 1730);
            }
        } else if (type === 'STEEL') {
            const data = STEEL_DB[specVal];
            if (data) {
                if (dInput) { dInput.value = formatComma(parseFloat(specVal).toFixed(1)); dInput.readOnly = true; }
                tSelect.innerHTML = `<option value="direct">직접 입력</option>`;
                data.tList.forEach(t => { tSelect.innerHTML += `<option value="${t}">${t}mm</option>`; });
                let defaultT = data.tList.includes(12) ? 12 : data.tList[0];
                tSelect.value = defaultT.toString();
                if (tInput) { tInput.value = defaultT; tInput.readOnly = true; }
                const gradeKey = container.querySelector('#steel_grade')?.value || 'STP275';
                if (grid5Val) grid5Val.value = formatComma(STEEL_GRADE_MAP[gradeKey] || 275000);
            }
        }
    }

    container.addEventListener('click', (e) => {
        if (e.target.id === 'pile_layer_add') {
            const nextIdx = pileLayers.length + 1;
            pileLayers.push({
                name: `지층${nextIdx}`,
                type: 'sand',
                dz: 5.0,
                n_val: 30,
                gamma: 19.0,
                c_val: 0.0,
                phi_val: 30.0,
                es_val: 30000,
                qu_val: 0
            });
            try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
            renderLayers();
        } else if (e.target.classList.contains('pl-del')) {
            pileLayers.splice(e.target.dataset.idx, 1);
            try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
            renderLayers();
        }
    });

    const calcBtn = container.querySelector('#calc-pile-btn');
    if (calcBtn) calcBtn.addEventListener('click', calculatePileCapacity);

    // 커서 포커스 아웃 시 정밀 소수점 및 정수/콤마 포맷팅
    container.addEventListener('focusout', (e) => {
        const target = e.target;
        if (target.classList.contains('dec-input')) {
            target.value = formatComma(parseNum(target.value), 1);
            return;
        }

        const idx = target.dataset.idx;
        if (idx === undefined) return;

        let val = parseNum(target.value);

        if (target.classList.contains('pl-dz')) {
            pileLayers[idx].dz = val;
            target.value = val.toFixed(1);
            updatePileLength();
        } else if (target.classList.contains('pl-gamma')) {
            pileLayers[idx].gamma = val;
            target.value = val.toFixed(1);
        } else if (target.classList.contains('pl-c')) {
            pileLayers[idx].c_val = val;
            target.value = val.toFixed(1);
        } else if (target.classList.contains('pl-phi')) {
            pileLayers[idx].phi_val = val;
            target.value = val.toFixed(1);
        } else if (target.classList.contains('pl-n')) {
            pileLayers[idx].n_val = Math.round(val);
            target.value = Math.round(val);
        } else if (target.classList.contains('pl-es')) {
            pileLayers[idx].es_val = Math.round(val);
            target.value = formatComma(Math.round(val));
        } else if (target.classList.contains('pl-qu')) {
            pileLayers[idx].qu_val = Math.round(val);
            target.value = Math.round(val);
        } else if (target.classList.contains('pl-name')) {
            pileLayers[idx].name = target.value;
        }

        try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
    });

    container.addEventListener('change', (e) => {
        if (e.target.id === 'pile_type') {
            updateUIState();
            try { localStorage.setItem('geo_pile_type', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_method') {
            updateMethodFormulas();
            try { localStorage.setItem('geo_pile_method', e.target.value); } catch(err){}
        } else if (e.target.id === 'phc_class' || e.target.id === 'pile_spec_select') {
            applySpecSelection();
        } else if (e.target.id === 'pile_qp_formula' || e.target.id === 'pile_qs_formula') {
            updateFormulaInfoText();
        } else if (e.target.id === 'pile_Cp_type') {
            const customInput = container.querySelector('#pile_Cp_custom');
            if (customInput) customInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
        } else if (e.target.classList.contains('pl-type')) {
            pileLayers[e.target.dataset.idx].type = e.target.value;
            try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
        }
    });

    updateUIState();

    function updatePileLength() {
        const totalL = calcTotalL();
        const pileLVal = container.querySelector('#pile_L_val');
        if (pileLVal) pileLVal.textContent = totalL.toFixed(1);
    }

    function renderLayers() {
        const tbody = container.querySelector('#pile_layers_body');
        if (!tbody) return;
        tbody.innerHTML = '';
        pileLayers.forEach((l, idx) => {
            tbody.innerHTML += `
                <tr>
                    <td style="padding:2px;"><input type="text" value="${l.name || '지층' + (idx+1)}" data-idx="${idx}" class="pl-name pl-input"></td>
                    <td style="padding:2px;">
                        <select data-idx="${idx}" class="pl-type pl-select">
                            <option value="sand" ${l.type === 'sand' ? 'selected' : ''}>사질토</option>
                            <option value="clay" ${l.type === 'clay' ? 'selected' : ''}>점성토</option>
                            <option value="gravel" ${l.type === 'gravel' ? 'selected' : ''}>자갈층</option>
                            <option value="weathered_soil" ${l.type === 'weathered_soil' ? 'selected' : ''}>풍화토</option>
                            <option value="weathered_rock" ${l.type === 'weathered_rock' ? 'selected' : ''}>풍화암</option>
                        </select>
                    </td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.dz || 0).toFixed(1)}" data-idx="${idx}" class="pl-dz pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${Math.round(parseFloat(l.n_val || 0))}" data-idx="${idx}" class="pl-n pl-input" step="1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.gamma || 19.0).toFixed(1)}" data-idx="${idx}" class="pl-gamma pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.c_val || 0).toFixed(1)}" data-idx="${idx}" class="pl-c pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.phi_val || 0).toFixed(1)}" data-idx="${idx}" class="pl-phi pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="text" value="${formatComma(Math.round(parseFloat(l.es_val || 0)))}" data-idx="${idx}" class="pl-es pl-input comma-input"></td>
                    <td style="padding:2px;"><input type="number" value="${Math.round(parseFloat(l.qu_val || 0))}" data-idx="${idx}" class="pl-qu pl-input" step="1"></td>
                    <td style="padding:2px;"><button type="button" class="pl-del" data-idx="${idx}" style="padding:2px 6px; background:#e74c3c; color:#fff; border:none; border-radius:3px; cursor:pointer;">-</button></td>
                </tr>
            `;
        });
        updatePileLength();
    }
    renderLayers();

    function calculatePileCapacity() {
        const p_type = container.querySelector('#pile_type').value;
        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qp_formula_key = container.querySelector('#pile_qp_formula')?.value || 'road';
        const qs_formula_key = container.querySelector('#pile_qs_formula')?.value || 'road';

        let D_mm = parseNum(container.querySelector('#pile_D').value) || 500;
        const D = D_mm / 1000.0;
        const t_mm = parseNum(container.querySelector('#pile_t').value) || 80;
        const grid5Val = parseNum(container.querySelector('#grid5_val').value) || 1730;
        const allow_settle = parseNum(container.querySelector('#pile_allow_settle')?.value) || 25.0;
        const user_Ep = parseNum(container.querySelector('#pile_Ep')?.value) || 39200000;
        const alpha_s = parseFloat(container.querySelector('#pile_alpha_s')?.value) || 0.67;

        const P_norm = parseNum(container.querySelector('#pile_P_norm').value) || 2062.8;
        const P_seis = parseNum(container.querySelector('#pile_P_seis').value) || 1728.6;

        const L = calcTotalL();
        const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
        const As = Math.PI * D;

        // 1. 선단지지력 (Qup)
        let lastLayer = pileLayers[pileLayers.length - 1] || { name: '지층3', n_val: 50, c_val: 0, type: 'weathered_soil' };
        let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
        let c_tip = parseFloat(lastLayer.c_val) || 0;
        let q_p = 0;

        if (method === 'driven') {
            q_p = 300.0 * Math.min(raw_N_tip, 60);
        } else {
            if (qp_formula_key === 'lh') {
                q_p = 250.0 * Math.min(raw_N_tip, 60);
            } else {
                let isGranular = ['sand', 'gravel', 'weathered_soil', 'weathered_rock'].includes(lastLayer.type);
                if (isGranular) {
                    q_p = Math.min(200.0 * raw_N_tip, 12000.0);
                } else {
                    q_p = Math.min(6.0 * c_tip, 12000.0);
                }
            }
        }
        const Qup = q_p * Ap;

        // 2. 주면마찰력 (Qus) 상세 산정
        let total_Qus = 0;
        let layer_calc_rows = [];
        let c_factor = (method === 'driven') ? 2.0 : (qs_formula_key === 'lh' ? 2.0 : 2.5);
        let c_factor_c = (method === 'driven') ? 1.0 : (qs_formula_key === 'lh' ? 5.0 : 0.8);
        const typeMap = { 'sand': '사질토', 'clay': '점성토', 'gravel': '자갈층', 'weathered_soil': '풍화토', 'weathered_rock': '풍화암' };

        pileLayers.forEach((l) => {
            let dz_i = parseFloat(l.dz) || 0;
            let n_i = parseFloat(l.n_val) || 0;
            let c_i = parseFloat(l.c_val) || 0;
            let gamma_i = parseFloat(l.gamma) || 19.0;
            let isGranular = ['sand', 'gravel', 'weathered_soil', 'weathered_rock'].includes(l.type);

            let f_unit = 0;
            let formula_str = "";

            if (isGranular) {
                let calc_val = c_factor * n_i;
                f_unit = Math.min(100.0, calc_val);
                formula_str = `min(100, ${c_factor} &times; ${n_i}) = ${f_unit.toFixed(1)} kN/m²`;
            } else {
                let calc_val = c_factor_c * c_i;
                f_unit = Math.min(100.0, calc_val);
                formula_str = `min(100, ${c_factor_c} &times; ${c_i}) = ${f_unit.toFixed(1)} kN/m²`;
            }

            let fxL = f_unit * dz_i;
            let Qus_i = fxL * As;
            total_Qus += Qus_i;

            layer_calc_rows.push({
                name: l.name,
                type: typeMap[l.type] || '사질토',
                dz: dz_i,
                n_val: n_i,
                gamma: gamma_i,
                c_val: c_i,
                formula: formula_str,
                fxL: fxL,
                qusi: Qus_i
            });
        });

        const Qu_total = Qup + total_Qus;
        const Qa_soil_norm = Qu_total / 3.0;
        const Qa_soil_seis = Qu_total / 2.0;

        // 3. 재료 내하력 (Qas) 및 감소율 산정
        let A_net = Ap;
        let Q_mat_base = grid5Val;
        if (p_type === 'STEEL') {
            let t1_mm = parseFloat(container.querySelector('#pile_t1')?.value) || 0;
            let D_out = D - (t1_mm / 1000.0);
            let D_in = Math.max(0, D - 2.0 * (t_mm / 1000.0));
            A_net = (Math.PI * (Math.pow(D_out, 2) - Math.pow(D_in, 2))) / 4.0;
            Q_mat_base = grid5Val * A_net;
        }

        const L_over_D = L / D;
        let n_limit = p_type === 'STEEL' ? 100 : 85;
        let mu1 = Math.max(0, L_over_D - n_limit);

        // 말뚝 이음에 의한 감소율 (mu2) 계산
        const joint_type = container.querySelector('#pile_joint_type')?.value || 'none';
        const joint_count = parseInt(container.querySelector('#pile_joint_count')?.value) || 0;
        let base_joint_rate = joint_type === 'weld' ? 5.0 : (joint_type === 'bolt' ? 10.0 : 0.0);
        let mu2 = method === 'bored' ? (base_joint_rate * 0.5 * joint_count) : (base_joint_rate * joint_count);

        const Qas = (1.0 - (mu1 + mu2) / 100.0) * Q_mat_base;

        const Q_app_norm = Math.min(Qa_soil_norm, Qas);
        const Q_app_seis = Math.min(Qa_soil_seis, Qas);

        // 허용값 대비 작용값 비율 계산 (%)
        const ratio_norm = (P_norm / Q_app_norm) * 100.0;
        const ratio_seis = (P_seis / Q_app_seis) * 100.0;

        // 4. 경험계수 Cp 및 침하량 상세 계산 (Vesic 1977 & CFEM 1992)
        let isTipSand = ['sand', 'gravel', 'weathered_soil', 'weathered_rock'].includes(lastLayer.type);
        let cp_min = method === 'driven' ? (isTipSand ? 0.02 : 0.02) : (isTipSand ? 0.09 : 0.03);
        let cp_max = method === 'driven' ? (isTipSand ? 0.04 : 0.03) : (isTipSand ? 0.18 : 0.06);
        let Cp_avg = (cp_min + cp_max) / 2.0;

        let cpSelectType = container.querySelector('#pile_Cp_type')?.value || 'avg';
        let Cp = Cp_avg;
        if (cpSelectType === 'min') Cp = cp_min;
        else if (cpSelectType === 'max') Cp = cp_max;
        else if (cpSelectType === 'custom') Cp = parseFloat(container.querySelector('#pile_Cp_custom')?.value) || 0.135;

        let Cs = (0.93 + 0.16 * Math.sqrt(L / D)) * Cp;
        let calc_qp = Math.max(q_p, 1.0);

        // (1) 평상시 작용하중 침하량
        let Qpa_norm = P_norm * (Qup / Qu_total);
        let Qfa_norm = P_norm * (total_Qus / Qu_total);

        let Ss_norm = ((Qpa_norm + alpha_s * Qfa_norm) * L) / (A_net * user_Ep) * 1000.0;
        let Sp_norm = (Cp * Qpa_norm) / (D * calc_qp) * 1000.0;
        let Sps_norm = (Cs * Qfa_norm) / (L * calc_qp) * 1000.0;
        let S_vesic_norm = Ss_norm + Sp_norm + Sps_norm;

        let S_cfem_direct_norm = (D * 1000.0) / 100.0;
        let S_cfem_elastic_norm = (P_norm * L) / (A_net * user_Ep) * 1000.0;
        let S_cfem_norm = S_cfem_direct_norm + S_cfem_elastic_norm;

        const ratio_settle_vesic_norm = (S_vesic_norm / allow_settle) * 100.0;
        const ratio_settle_cfem_norm = (S_cfem_norm / allow_settle) * 100.0;

        // (2) 지진시 작용하중 침하량
        let Qpa_seis = P_seis * (Qup / Qu_total);
        let Qfa_seis = P_seis * (total_Qus / Qu_total);

        let Ss_seis = ((Qpa_seis + alpha_s * Qfa_seis) * L) / (A_net * user_Ep) * 1000.0;
        let Sp_seis = (Cp * Qpa_seis) / (D * calc_qp) * 1000.0;
        let Sps_seis = (Cs * Qfa_seis) / (L * calc_qp) * 1000.0;
        let S_vesic_seis = Ss_seis + Sp_seis + Sps_seis;

        let S_cfem_direct_seis = (D * 1000.0) / 100.0;
        let S_cfem_elastic_seis = (P_seis * L) / (A_net * user_Ep) * 1000.0;
        let S_cfem_seis = S_cfem_direct_seis + S_cfem_elastic_seis;

        const ratio_settle_vesic_seis = (S_vesic_seis / allow_settle) * 100.0;
        const ratio_settle_cfem_seis = (S_cfem_seis / allow_settle) * 100.0;

        const resultDiv = container.querySelector('#pile-result');
        if (!resultDiv) return;
        resultDiv.style.display = 'block';

        resultDiv.innerHTML = `
            <div class="section-title">[말뚝기초 지지력/침하량 최종 검토 요약]</div>
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
                            <td rowspan="2" style="background:#eaf2f8; font-weight:bold;">지지력 검토</td>
                            <td>평상시 (상시)</td>
                            <td style="font-weight:bold; color:#2980b9;">${formatComma(P_norm, 1)} kN</td>
                            <td>${formatComma(Q_app_norm, 1)} kN</td>
                            <td style="font-weight:bold; color:${P_norm <= Q_app_norm ? '#27ae60' : '#c0392b'};">${P_norm <= Q_app_norm ? 'O.K' : 'N.G'} (${ratio_norm.toFixed(1)}%)</td>
                        </tr>
                        <tr>
                            <td>내진시 (지진시)</td>
                            <td style="font-weight:bold; color:#2980b9;">${formatComma(P_seis, 1)} kN</td>
                            <td>${formatComma(Q_app_seis, 1)} kN</td>
                            <td style="font-weight:bold; color:${P_seis <= Q_app_seis ? '#27ae60' : '#c0392b'};">${P_seis <= Q_app_seis ? 'O.K' : 'N.G'} (${ratio_seis.toFixed(1)}%)</td>
                        </tr>
                        <tr>
                            <td rowspan="2" style="background:#f5eef8; font-weight:bold;">침하량 검토<br><span style="font-size:0.8em; color:#2980b9; font-weight:normal;">(평상시 하중)</span></td>
                            <td>반경험적 (Vesic)</td>
                            <td style="font-weight:bold; color:#8e44ad;">${S_vesic_norm.toFixed(2)} mm</td>
                            <td rowspan="2" style="vertical-align: middle;">${allow_settle.toFixed(1)} mm</td>
                            <td style="font-weight:bold; color:${S_vesic_norm <= allow_settle ? '#27ae60' : '#c0392b'};">${S_vesic_norm <= allow_settle ? 'O.K' : 'N.G'} (${ratio_settle_vesic_norm.toFixed(1)}%)</td>
                        </tr>
                        <tr>
                            <td>경험적 (CFEM)</td>
                            <td style="font-weight:bold; color:#27ae60;">${S_cfem_norm.toFixed(2)} mm</td>
                            <td style="font-weight:bold; color:${S_cfem_norm <= allow_settle ? '#27ae60' : '#c0392b'};">${S_cfem_norm <= allow_settle ? 'O.K' : 'N.G'} (${ratio_settle_cfem_norm.toFixed(1)}%)</td>
                        </tr>
                        <tr>
                            <td rowspan="2" style="background:#f5eef8; font-weight:bold;">침하량 검토<br><span style="font-size:0.8em; color:#c0392b; font-weight:normal;">(지진시 하중)</span></td>
                            <td>반경험적 (Vesic)</td>
                            <td style="font-weight:bold; color:#8e44ad;">${S_vesic_seis.toFixed(2)} mm</td>
                            <td rowspan="2" style="vertical-align: middle;">${allow_settle.toFixed(1)} mm</td>
                            <td style="font-weight:bold; color:${S_vesic_seis <= allow_settle ? '#27ae60' : '#c0392b'};">${S_vesic_seis <= allow_settle ? 'O.K' : 'N.G'} (${ratio_settle_vesic_seis.toFixed(1)}%)</td>
                        </tr>
                        <tr>
                            <td>경험적 (CFEM)</td>
                            <td style="font-weight:bold; color:#27ae60;">${S_cfem_seis.toFixed(2)} mm</td>
                            <td style="font-weight:bold; color:${S_cfem_seis <= allow_settle ? '#27ae60' : '#c0392b'};">${S_cfem_seis <= allow_settle ? 'O.K' : 'N.G'} (${ratio_settle_cfem_seis.toFixed(1)}%)</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="section-title">[검증 1] 지반에 의한 연직 허용지지력 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px; line-height:1.6;">
                <strong>(1) 말뚝 선단지지력 (Q<sub>up</sub>)</strong><br>
                • 적용 산정식: ${method === 'driven' ? '항타공법 표준식 (2008)' : (qp_formula_key === 'lh' ? 'LH 말뚝기초 설계개선지침 (2008)' : '도로교설계기준해설 (2008)')}<br>
                • 최하단 지층(지지층) : ${lastLayer.name} (N = ${raw_N_tip}, c = ${c_tip} kPa)<br>
                • 단위면적당 극한선단지지력 q<sub>p</sub> = min(200 &times; ${raw_N_tip}, 12,000) = min(${(200*raw_N_tip).toFixed(1)}, 12,000) = <strong>${formatComma(q_p, 1)} kN/m²</strong><br>
                • 선단면적 A<sub>p</sub> = ${frac("&pi; &times; D²", "4")} = ${frac("&pi; &times; " + D.toFixed(3) + "²", "4")} = <strong>${Ap.toFixed(5)} m²</strong><br>
                • <strong>극한선단지지력 Q<sub>up</sub></strong> = q<sub>p</sub> &times; A<sub>p</sub> = ${formatComma(q_p, 1)} &times; ${Ap.toFixed(5)} = <span style="font-weight:bold; color:#2980b9;">${formatComma(Qup, 1)} kN</span>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px; line-height:1.6;">
                <strong>(2) 말뚝 주면마찰력 (Q<sub>us</sub>)</strong><br>
                • 적용 산정식: ${qs_formula_key === 'lh' ? 'LH 말뚝기초 설계개선지침 (2008)' : '도로교설계기준해설 (2008)'}<br>
                • 말뚝 둘레 A<sub>s</sub> = &pi; &times; D = &pi; &times; ${D.toFixed(3)} = <strong>${As.toFixed(3)} m</strong><br>
                • <strong>총 극한주면마찰력 Q<sub>us</sub></strong> = &sum; (f<sub>s,i</sub> &times; L<sub>i</sub>) &times; A<sub>s</sub> = <span style="font-weight:bold; color:#2980b9;">${formatComma(total_Qus, 1)} kN</span>

                <div class="table-container" style="margin-top: 10px; margin-bottom: 5px;">
                    <table class="result-table" style="font-size: 0.88em; text-align: center;">
                        <thead>
                            <tr style="background-color: #eaeded;">
                                <th>지층명</th>
                                <th>토성구분</th>
                                <th>층후 L<br>(m)</th>
                                <th>N치 / &gamma; / c</th>
                                <th style="min-width: 250px;">단위 마찰력 f<sub>s</sub> 계산 과정 (kN/m²)</th>
                                <th>f<sub>s</sub> &times; L</th>
                                <th>층별 주면마찰력<br>Q<sub>us,i</sub> (kN)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${layer_calc_rows.map(r => `
                                <tr>
                                    <td>${r.name}</td>
                                    <td>${r.type}</td>
                                    <td>${r.dz.toFixed(1)}</td>
                                    <td>${Math.round(r.n_val)} / ${r.gamma.toFixed(1)} / ${r.c_val.toFixed(1)}</td>
                                    <td style="text-align: left; padding: 6px 10px; line-height: 1.45;">${r.formula}</td>
                                    <td>${r.fxL.toFixed(1)}</td>
                                    <td style="font-weight:bold; color:#2980b9;">${formatComma(r.qusi, 1)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #f5eef8; font-weight: bold;">
                                <td colspan="6">주면마찰력 합계 (&sum;)</td>
                                <td style="color:#27ae60; font-size:1.05em;">${formatComma(total_Qus, 1)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height:1.6;">
                <strong>(3) 지반에 의한 극한지지력 및 허용지지력 (Q<sub>u</sub>, Q<sub>a,soil</sub>)</strong><br>
                • 극한지지력 Q<sub>u</sub> = Q<sub>up</sub> + Q<sub>us</sub> = ${formatComma(Qup, 1)} + ${formatComma(total_Qus, 1)} = <strong>${formatComma(Qu_total, 1)} kN</strong><br>
                • 평상시 허용지지력 (F.S = 3.0) = ${frac("Q<sub>u</sub>", "3.0")} = ${frac(formatComma(Qu_total, 1), "3.0")} = <strong>${formatComma(Qa_soil_norm, 1)} kN</strong><br>
                • 내진시 허용지지력 (F.S = 2.0) = ${frac("Q<sub>u</sub>", "2.0")} = ${frac(formatComma(Qu_total, 1), "2.0")} = <strong>${formatComma(Qa_soil_seis, 1)} kN</strong>
            </div>

            <div class="section-title">[검증 2] 본체부 말뚝 내하력 (재료 허용압축하중 Q<sub>as</sub>) 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height: 1.6;">
                • 기본 허용압축하중 Q<sub>mat_base</sub> = P<sub>a</sub> = <strong>${formatComma(Q_mat_base, 1)} kN</strong><br>
                • 장경비 감소율 (&mu;<sub>1</sub>) = L/D - n = max(0, ${frac(L.toFixed(1), D.toFixed(3))} - ${n_limit}) = <strong>${mu1.toFixed(2)} %</strong>
                
                <div style="margin: 8px 0 12px 0;">
                    <div style="font-weight:bold; color:#2c3e50; font-size:0.88em;">■ 말뚝 종류별 장경비 감소 기준</div>
                    <table class="result-table" style="font-size:0.82em; text-align:center; margin: 4px 0 2px 0;">
                        <thead>
                            <tr style="background-color: #eaeded;">
                                <th>구 분</th>
                                <th style="width:35%;">PHC말뚝</th>
                                <th style="width:35%;">강관말뚝</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>n</td>
                                <td>85</td>
                                <td>100</td>
                            </tr>
                            <tr>
                                <td>장경비의 상한계 <sup>1)</sup></td>
                                <td>110</td>
                                <td>130</td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="font-size:0.78em; color:#7f8c8d;">1) 장경비에 의한 말뚝재료 허용응력 감소를 감안하더라도, 장경비 상한계 이상으로 설계하지 않는 것이 좋다.</div>
                </div>

                • 말뚝이음에 의한 감소율 (&mu;<sub>2</sub>) = <strong>${mu2.toFixed(1)} %</strong> (${joint_type === 'weld' ? '용접이음' : (joint_type === 'bolt' ? '볼트이음' : '이음없음')}, ${joint_count}개소 적용)

                <div style="margin: 8px 0 12px 0;">
                    <div style="font-weight:bold; color:#2c3e50; font-size:0.88em;">■ 말뚝이음에 의한 허용하중 감소율</div>
                    <table class="result-table" style="font-size:0.82em; text-align:center; margin: 4px 0 2px 0;">
                        <thead>
                            <tr style="background-color: #eaeded;">
                                <th>이음방법</th>
                                <th style="width:25%;">용접이음</th>
                                <th style="width:25%;">볼트식 이음</th>
                                <th style="width:35%;">비고</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>감소율</td>
                                <td>5%/개소</td>
                                <td>10%/개소</td>
                                <td style="text-align:left; padding:4px 8px;">매입말뚝 경우에는 이음부 손상이 거의 없으므로 이음방법별 감소율 절반 적용</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                • <strong>본체부 말뚝 내하력 Q<sub>as</sub></strong> = (1 - ${frac("&mu;<sub>1</sub> + &mu;<sub>2</sub>", "100")}) &times; Q<sub>mat_base</sub> = (1 - ${frac(`${mu1.toFixed(2)} + ${mu2.toFixed(1)}`, "100")}) &times; ${formatComma(Q_mat_base, 1)} = <span style="color:#2980b9; font-weight:bold; font-size:1.05em;">${formatComma(Qas, 1)} kN</span>
            </div>

            <div class="section-title">[검증 3] 말뚝 연직침하량 산정 상세 (기성말뚝)</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <div style="font-weight:bold; color:#2c3e50; font-size:0.88em;">■ 흙의 종류와 말뚝시공법에 따른 경험계수 C<sub>p</sub> 값</div>
                <div class="table-container" style="margin: 8px 0;">
                    <table class="result-table" style="font-size:0.85em; text-align:center;">
                        <thead>
                            <tr style="background:#eaeded;">
                                <th>흙의 종류</th>
                                <th style="width:35%;">타입말뚝</th>
                                <th style="width:35%;">굴착말뚝</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="${isTipSand ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                                <td>모래 (조밀~느슨)</td>
                                <td>0.02 ~ 0.04</td>
                                <td>0.09 ~ 0.18</td>
                            </tr>
                            <tr style="${lastLayer.type === 'clay' ? 'background:#e8f8f5; font-weight:bold;' : ''}">
                                <td>점토 (굳은~연약)</td>
                                <td>0.02 ~ 0.03</td>
                                <td>0.03 ~ 0.06</td>
                            </tr>
                            <tr>
                                <td>실트 (조밀~느슨)</td>
                                <td>0.03 ~ 0.05</td>
                                <td>0.09 ~ 0.12</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                • 선단 지지층 흙 종류: <strong>${typeMap[lastLayer.type] || '사질토'}</strong> / 적용 시공법: <strong>${method === 'bored' ? '굴착말뚝' : '타입말뚝'}</strong><br>
                • 경험계수 C<sub>p</sub> = ${frac(cp_min.toFixed(2) + " + " + cp_max.toFixed(2), "2")} = <strong>${Cp.toFixed(3)}</strong>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>(1) 평상시 작용하중 (P<sub>norm</sub> = ${formatComma(P_norm, 1)} kN) 기준 침하량</strong><br>
                
                <div style="margin-top:8px;">
                    • <strong>반경험적 방법에 의한 침하량 (Vesic, 1977) :</strong>
                    <div style="margin-left:12px; margin-top:4px;">
                        1) 침하량 산정용 전달하중 분배<br>
                        &nbsp;&nbsp;• 선단 전달하중 (Q<sub>pa</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: Q<sub>pa</sub> = P &times; ${frac("Q<sub>up</sub>", "Q<sub>u</sub>")}<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: ${formatComma(P_norm, 1)} &times; ${frac(formatComma(Qup, 1), formatComma(Qu_total, 1))}<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${formatComma(Qpa_norm, 1)} kN</strong><br>
                        &nbsp;&nbsp;• 주면 전달하중 (Q<sub>fa</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: Q<sub>fa</sub> = P &times; ${frac("Q<sub>us</sub>", "Q<sub>u</sub>")}<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: ${formatComma(P_norm, 1)} &times; ${frac(formatComma(total_Qus, 1), formatComma(Qu_total, 1))}<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${formatComma(Qfa_norm, 1)} kN</strong><br><br>

                        2) 말뚝 자체 탄성변형량 (S<sub>s</sub>)<br>
                        &nbsp;&nbsp;- 공식: S<sub>s</sub> = ${frac("(Q<sub>pa</sub> + &alpha;<sub>s</sub> &times; Q<sub>fa</sub>) &times; L", "A<sub>net</sub> &times; E<sub>p</sub>")} &times; 1000<br>
                        &nbsp;&nbsp;- 계산: ${frac("(" + formatComma(Qpa_norm, 1) + " + " + alpha_s + " &times; " + formatComma(Qfa_norm, 1) + ") &times; " + L.toFixed(1), Ap.toFixed(5) + " &times; " + formatComma(user_Ep))} &times; 1000<br>
                        &nbsp;&nbsp;- 결과: <strong>${Ss_norm.toFixed(3)} mm</strong><br><br>

                        3) 선단 전달하중에 의한 침하량 (S<sub>p</sub>)<br>
                        &nbsp;&nbsp;• 단위면적당 극한선단지지력 (q<sub>p</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: q<sub>p</sub> = min(200 &times; N, 12,000)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: min(200 &times; ${raw_N_tip}, 12,000)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${formatComma(q_p, 1)} kN/m²</strong><br>
                        &nbsp;&nbsp;• 선단 침하량 (S<sub>p</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: S<sub>p</sub> = ${frac("C<sub>p</sub> &times; Q<sub>pa</sub>", "D &times; q<sub>p</sub>")} &times; 1000<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: ${frac(Cp.toFixed(3) + " &times; " + formatComma(Qpa_norm, 1), D.toFixed(3) + " &times; " + formatComma(q_p, 1))} &times; 1000<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${Sp_norm.toFixed(3)} mm</strong><br><br>

                        4) 주면 전달하중에 의한 침하량 (S<sub>ps</sub>)<br>
                        &nbsp;&nbsp;• 주면 경험계수 (C<sub>s</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: C<sub>s</sub> = (0.93 + 0.16 &times; &radic;${frac("L", "D")}) &times; C<sub>p</sub><br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: (0.93 + 0.16 &times; &radic;${frac(L.toFixed(1), D.toFixed(3))}) &times; ${Cp.toFixed(3)}<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${Cs.toFixed(4)}</strong><br>
                        &nbsp;&nbsp;• 주면 침하량 (S<sub>ps</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: S<sub>ps</sub> = ${frac("C<sub>s</sub> &times; Q<sub>fa</sub>", "L &times; q<sub>p</sub>")} &times; 1000<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: ${frac(Cs.toFixed(4) + " &times; " + formatComma(Qfa_norm, 1), L.toFixed(1) + " &times; " + formatComma(q_p, 1))} &times; 1000<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${Sps_norm.toFixed(3)} mm</strong><br><br>

                        5) 반경험적 총 침하량 (S<sub>vesic,norm</sub>)<br>
                        &nbsp;&nbsp;- 공식: S<sub>vesic,norm</sub> = S<sub>s</sub> + S<sub>p</sub> + S<sub>ps</sub><br>
                        &nbsp;&nbsp;- 계산: ${Ss_norm.toFixed(3)} + ${Sp_norm.toFixed(3)} + ${Sps_norm.toFixed(3)}<br>
                        &nbsp;&nbsp;- 결과: <span style="color:#8e44ad; font-weight:bold;">${S_vesic_norm.toFixed(2)} mm</span>
                    </div>
                </div>

                <div style="margin-top:12px;">
                    • <strong>경험적 방법에 의한 침하량 (CFEM, 1992) :</strong>
                    <div style="margin-left:12px; margin-top:4px;">
                        1) 직경 항 침하량 (S<sub>d</sub>)<br>
                        &nbsp;&nbsp;- 공식: S<sub>d</sub> = ${frac("D", "100")} &times; 1000<br>
                        &nbsp;&nbsp;- 계산: ${frac(D.toFixed(3), "100")} &times; 1000<br>
                        &nbsp;&nbsp;- 결과: <strong>${S_cfem_direct_norm.toFixed(3)} mm</strong><br><br>

                        2) 탄성 압축 항 침하량 (S<sub>e</sub>)<br>
                        &nbsp;&nbsp;- 공식: S<sub>e</sub> = ${frac("P &times; L", "A<sub>net</sub> &times; E<sub>p</sub>")} &times; 1000<br>
                        &nbsp;&nbsp;- 계산: ${frac(formatComma(P_norm, 1) + " &times; " + L.toFixed(1), Ap.toFixed(5) + " &times; " + formatComma(user_Ep))} &times; 1000<br>
                        &nbsp;&nbsp;- 결과: <strong>${S_cfem_elastic_norm.toFixed(3)} mm</strong><br><br>

                        3) 경험적 총 침하량 (S<sub>cfem,norm</sub>)<br>
                        &nbsp;&nbsp;- 공식: S<sub>cfem,norm</sub> = S<sub>d</sub> + S<sub>e</sub><br>
                        &nbsp;&nbsp;- 계산: ${S_cfem_direct_norm.toFixed(3)} + ${S_cfem_elastic_norm.toFixed(3)}<br>
                        &nbsp;&nbsp;- 결과: <span style="color:#27ae60; font-weight:bold;">${S_cfem_norm.toFixed(2)} mm</span>
                    </div>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>(2) 지진시 작용하중 (P<sub>seis</sub> = ${formatComma(P_seis, 1)} kN) 기준 침하량</strong><br>
                
                <div style="margin-top:8px;">
                    • <strong>반경험적 방법에 의한 침하량 (Vesic, 1977) :</strong>
                    <div style="margin-left:12px; margin-top:4px;">
                        1) 침하량 산정용 전달하중 분배<br>
                        &nbsp;&nbsp;• 선단 전달하중 (Q<sub>pa</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: Q<sub>pa</sub> = P &times; ${frac("Q<sub>up</sub>", "Q<sub>u</sub>")}<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: ${formatComma(P_seis, 1)} &times; ${frac(formatComma(Qup, 1), formatComma(Qu_total, 1))}<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${formatComma(Qpa_seis, 1)} kN</strong><br>
                        &nbsp;&nbsp;• 주면 전달하중 (Q<sub>fa</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: Q<sub>fa</sub> = P &times; ${frac("Q<sub>us</sub>", "Q<sub>u</sub>")}<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: ${formatComma(P_seis, 1)} &times; ${frac(formatComma(total_Qus, 1), formatComma(Qu_total, 1))}<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${formatComma(Qfa_seis, 1)} kN</strong><br><br>

                        2) 말뚝 자체 탄성변형량 (S<sub>s</sub>)<br>
                        &nbsp;&nbsp;- 공식: S<sub>s</sub> = ${frac("(Q<sub>pa</sub> + &alpha;<sub>s</sub> &times; Q<sub>fa</sub>) &times; L", "A<sub>net</sub> &times; E<sub>p</sub>")} &times; 1000<br>
                        &nbsp;&nbsp;- 계산: ${frac("(" + formatComma(Qpa_seis, 1) + " + " + alpha_s + " &times; " + formatComma(Qfa_seis, 1) + ") &times; " + L.toFixed(1), Ap.toFixed(5) + " &times; " + formatComma(user_Ep))} &times; 1000<br>
                        &nbsp;&nbsp;- 결과: <strong>${Ss_seis.toFixed(3)} mm</strong><br><br>

                        3) 선단 전달하중에 의한 침하량 (S<sub>p</sub>)<br>
                        &nbsp;&nbsp;• 단위면적당 극한선단지지력 (q<sub>p</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: q<sub>p</sub> = min(200 &times; N, 12,000)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: min(200 &times; ${raw_N_tip}, 12,000)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${formatComma(q_p, 1)} kN/m²</strong><br>
                        &nbsp;&nbsp;• 선단 침하량 (S<sub>p</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: S<sub>p</sub> = ${frac("C<sub>p</sub> &times; Q<sub>pa</sub>", "D &times; q<sub>p</sub>")} &times; 1000<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: ${frac(Cp.toFixed(3) + " &times; " + formatComma(Qpa_seis, 1), D.toFixed(3) + " &times; " + formatComma(q_p, 1))} &times; 1000<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${Sp_seis.toFixed(3)} mm</strong><br><br>

                        4) 주면 전달하중에 의한 침하량 (S<sub>ps</sub>)<br>
                        &nbsp;&nbsp;• 주면 경험계수 (C<sub>s</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: C<sub>s</sub> = (0.93 + 0.16 &times; &radic;${frac("L", "D")}) &times; C<sub>p</sub><br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: (0.93 + 0.16 &times; &radic;${frac(L.toFixed(1), D.toFixed(3))}) &times; ${Cp.toFixed(3)}<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${Cs.toFixed(4)}</strong><br>
                        &nbsp;&nbsp;• 주면 침하량 (S<sub>ps</sub>)<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 공식: S<sub>ps</sub> = ${frac("C<sub>s</sub> &times; Q<sub>fa</sub>", "L &times; q<sub>p</sub>")} &times; 1000<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 계산: ${frac(Cs.toFixed(4) + " &times; " + formatComma(Qfa_seis, 1), L.toFixed(1) + " &times; " + formatComma(q_p, 1))} &times; 1000<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;- 결과: <strong>${Sps_seis.toFixed(3)} mm</strong><br><br>

                        5) 반경험적 총 침하량 (S<sub>vesic,seis</sub>)<br>
                        &nbsp;&nbsp;- 공식: S<sub>vesic,seis</sub> = S<sub>s</sub> + S<sub>p</sub> + S<sub>ps</sub><br>
                        &nbsp;&nbsp;- 계산: ${Ss_seis.toFixed(3)} + ${Sp_seis.toFixed(3)} + ${Sps_seis.toFixed(3)}<br>
                        &nbsp;&nbsp;- 결과: <span style="color:#8e44ad; font-weight:bold;">${S_vesic_seis.toFixed(2)} mm</span>
                    </div>
                </div>

                <div style="margin-top:12px;">
                    • <strong>경험적 방법에 의한 침하량 (CFEM, 1992) :</strong>
                    <div style="margin-left:12px; margin-top:4px;">
                        1) 직경 항 침하량 (S<sub>d</sub>)<br>
                        &nbsp;&nbsp;- 공식: S<sub>d</sub> = ${frac("D", "100")} &times; 1000<br>
                        &nbsp;&nbsp;- 계산: ${frac(D.toFixed(3), "100")} &times; 1000<br>
                        &nbsp;&nbsp;- 결과: <strong>${S_cfem_direct_seis.toFixed(3)} mm</strong><br><br>

                        2) 탄성 압축 항 침하량 (S<sub>e</sub>)<br>
                        &nbsp;&nbsp;- 공식: S<sub>e</sub> = ${frac("P &times; L", "A<sub>net</sub> &times; E<sub>p</sub>")} &times; 1000<br>
                        &nbsp;&nbsp;- 계산: ${frac(formatComma(P_seis, 1) + " &times; " + L.toFixed(1), Ap.toFixed(5) + " &times; " + formatComma(user_Ep))} &times; 1000<br>
                        &nbsp;&nbsp;- 결과: <strong>${S_cfem_elastic_seis.toFixed(3)} mm</strong><br><br>

                        3) 경험적 총 침하량 (S<sub>cfem,seis</sub>)<br>
                        &nbsp;&nbsp;- 공식: S<sub>cfem,seis</sub> = S<sub>d</sub> + S<sub>e</sub><br>
                        &nbsp;&nbsp;- 계산: ${S_cfem_direct_seis.toFixed(3)} + ${S_cfem_elastic_seis.toFixed(3)}<br>
                        &nbsp;&nbsp;- 결과: <span style="color:#27ae60; font-weight:bold;">${S_cfem_seis.toFixed(2)} mm</span>
                    </div>
                </div>
            </div>
        `;
    }
}
