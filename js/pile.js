// pile.js (기성말뚝 전용: PHC 말뚝 및 강관 말뚝)

export function initPileModule(container) {
    const getVal = (id, defaultVal) => {
        try {
            return localStorage.getItem('geo_pile_' + id) ?? defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

    const frac = (num, den) => '<span style="display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; margin:0 4px;"><span style="border-bottom:1px solid #2c3e50; padding:1px 4px;">' + num + '</span><span style="padding:1px 4px;">' + den + '</span></span>';

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

    let savedD = parseFloat(getVal('D', '500'));
    let pileLayers;
    try {
        pileLayers = JSON.parse(localStorage.getItem('geo_pile_layers'));
    } catch (e) {
        pileLayers = null;
    }

    if (!pileLayers || !Array.isArray(pileLayers) || pileLayers.length === 0) {
        pileLayers = [
            { name: '매립사질', type: 'clay', dz: 2.10, n_val: 20, gamma: 18.5, c_val: 5.0, phi: 0, es: 10000 },
            { name: '점토', type: 'clay', dz: 1.60, n_val: 20, gamma: 18.0, c_val: 35.0, phi: 0, es: 12000 },
            { name: '풍화토1', type: 'sand', dz: 1.30, n_val: 20, gamma: 19.0, c_val: 15.0, phi: 28, es: 20000 },
            { name: '지층4', type: 'sand', dz: 1.00, n_val: 37, gamma: 19.5, c_val: 20.0, phi: 29, es: 55000 },
            { name: '지층5', type: 'sand', dz: 5.60, n_val: 50, gamma: 20.0, c_val: 25.0, phi: 30, es: 70000 },
            { name: '지층7', type: 'sand', dz: 6.10, n_val: 50, gamma: 23.0, c_val: 350.0, phi: 33, es: 150000 }
        ];
        try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch (e) {}
    }

    const calcTotalL = () => pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);
    const initialType = getVal('type', 'PHC');
    const initialT1 = parseFloat(getVal('t1', '1.0')).toFixed(1);
    const initialMethod = getVal('method', 'bored');
    const initialGWT = parseFloat(getVal('gwt', '2.0')).toFixed(1);

    container.innerHTML = `
        <style>
            .pl-input::-webkit-outer-spin-button, .pl-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            .pl-input { -moz-appearance: textfield; width: 100%; box-sizing: border-box; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 3px; font-size: 0.9em; }
            .pl-input:focus { border-color: #2980b9; outline: none; }
        </style>

        <h3>기성말뚝 기초 검토 (PHC / 강관말뚝)</h3>
        
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50;">■ 말뚝기초 제원 및 시공 조건</div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px;">
            <div class="input-group" style="margin:0;">
                <label>말뚝 종류</label>
                <select id="pile_type" style="width:100%; height:32px; box-sizing:border-box; padding:4px;">
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
                    <input type="number" id="pile_D" value="${savedD}" step="0.1" class="pl-input" style="width:45%; height:100%;">
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
                <label id="grid5_label" style="font-size: 0.78em; white-space: nowrap;">허용축하중 P<sub>a</sub> (kN)</label>
                <input type="number" id="grid5_val" value="${getVal('grid5_val', '1730')}" step="0.1" class="pl-input" style="height:32px; font-weight:bold;">
            </div>
        </div>

        <div id="pile_row2_container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px;"></div>
        <div id="formula_info_box" style="margin-bottom: 15px; font-size: 0.83em; color: #2c3e50; background: #f4f6f7; padding: 8px 12px; border-radius: 4px; border-left: 4px solid #16a085;"></div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400;">■ 작용 하중 (상부구조 반력)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#d35400;">평상시 연직 P<sub>norm</sub> (kN)</label><input type="number" id="pile_P_norm" value="${getVal('P_norm', '2062.8')}" step="0.1" class="pl-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#c0392b;">지진시 연직 P<sub>seis</sub> (kN)</label><input type="number" id="pile_P_seis" value="${getVal('P_seis', '1728.6')}" step="0.1" class="pl-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#2980b9;">평상시 수평 H<sub>norm</sub> (kN)</label><input type="number" id="pile_H_norm" value="${getVal('H_norm', '150')}" step="0.1" class="pl-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#8e44ad;">지진시 수평 H<sub>seis</sub> (kN)</label><input type="number" id="pile_H_seis" value="${getVal('H_seis', '300')}" step="0.1" class="pl-input"></div>
        </div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #8e44ad;">■ 수평 해석 및 허용 기준 조건</div>
        <div class="input-grid" style="margin-bottom: 10px; background-color: #f5eef8; padding: 10px; border-radius: 5px; border: 1px solid #d7bde2; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
            <div class="input-group" style="background:#fff; margin:0;">
                <label>말뚝 두부 조건</label>
                <select id="pile_head_cond" style="width:100%; height:32px; padding:4px;">
                    <option value="free" ${getVal('head_cond', 'free') === 'free' ? 'selected' : ''}>두부 자유 (Free)</option>
                    <option value="fixed" ${getVal('head_cond', 'free') === 'fixed' ? 'selected' : ''}>두부 고정 (Fixed)</option>
                </select>
            </div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#2980b9; font-size: 0.78em;">추정계수 &alpha; (평상시)</label><input type="number" id="pile_alpha_norm" value="${getVal('alpha_norm', '1.0')}" step="0.1" class="pl-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#8e44ad; font-size: 0.78em;">말뚝 탄성계수 E<sub>p</sub> (kPa)</label><input type="number" id="pile_Ep" value="${getVal('Ep', '39200000')}" step="100000" class="pl-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#d4ac0d;">허용 연직 침하량 (mm)</label><input type="number" id="pile_allow_settle" value="${getVal('allow_settle', '25.0')}" step="0.1" class="pl-input"></div>
            <div class="input-group" style="background:#fff; margin:0;"><label style="color:#16a085;">허용 수평 변위량 (mm)</label><input type="number" id="pile_allow_h_disp" value="${getVal('allow_h_disp', '15.0')}" step="0.1" class="pl-input"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-weight: bold; color: #27ae60;">■ 지층 정보</span>
                <div style="display: flex; align-items: center; gap: 5px; font-size: 0.85em; background: #eaf2f8; padding: 2px 8px; border-radius: 4px;">
                    <label for="pile_gwt" style="font-weight: bold;">지하수위 GWT (GL. -m):</label>
                    <input type="number" id="pile_gwt" value="${initialGWT}" step="0.1" style="width: 55px; height: 22px; text-align: center;">
                </div>
            </div>
            <button type="button" id="pile_layer_add" style="padding: 4px 10px; background: #27ae60; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">+ 지층 추가</button>
        </div>
        
        <div style="background-color: #e8f8f5; padding: 8px; border-radius: 6px; border: 1px solid #a3e4d7; margin-bottom: 15px;">
            <div class="table-container" style="margin: 0; overflow-x: auto;">
                <table class="result-table" style="font-size: 0.8em; text-align: center; margin: 0; width: 100%;">
                    <thead>
                        <tr style="background-color: #d1f2eb;">
                            <th>지층명</th><th>토성구분</th><th>층후(m)</th><th>N치</th><th>&gamma; (kN/m³)</th><th>점착력 c (kPa)</th><th>마찰각 &phi; (°)</th><th>변형계수 E<sub>s</sub> (kPa)</th><th>삭제</th>
                        </tr>
                    </thead>
                    <tbody id="pile_layers_body"></tbody>
                    <tfoot>
                        <tr style="background-color: #ebf5fb; font-weight: bold;">
                            <td colspan="2" style="text-align: right; color: #2980b9;">말뚝 총 길이 L (m) :</td>
                            <td id="pile_L_val" style="color: #16a085; font-size: 1.05em;">${calcTotalL().toFixed(1)}</td>
                            <td colspan="6" style="text-align: left; color: #7f8c8d;">(지층 층후 자동 합산)</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <button type="button" class="action-btn" id="calc-pile-btn" style="margin-top: 10px; cursor: pointer;">기성말뚝 지지력, 수평력 및 침하량 종합산정</button>
        <div id="pile-result" class="result-box" style="display: none;"></div>
    `;

    function updateFormulaInfoText() {
        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qpVal = container.querySelector('#pile_qp_formula')?.value || 'road';
        const qsVal = container.querySelector('#pile_qs_formula')?.value || 'road';
        const infoBox = container.querySelector('#formula_info_box');

        if (!infoBox) return;

        let qpText = method === 'driven' ? "300 &times; N (N&le;60)" : (qpVal === 'lh' ? "250 &times; N (N&le;60)" : "200 &times; N (사질토, 상한 12,000 kPa), 6 &times; c<sub>u</sub> (점성토)");
        let qsText = qsVal === 'lh' ? "2.0 &times; N (사질토), 5.0 &times; q<sub>u</sub> (점성토)" : "2.5 &times; N (사질토, 상한 100 kPa), 0.8 &times; c<sub>u</sub> (점성토)";

        infoBox.innerHTML = `
            <div style="font-weight: bold; color: #16a085;">▶ 적용 산정식 개요 (기성말뚝 전용)</div>
            <div style="margin-left: 6px; line-height: 1.5;">
                • <strong>연직 선단지지력 :</strong> ${qpText}<br>
                • <strong>연직 주면마찰력 :</strong> ${qsText}<br>
                • <strong>연직 침하량 :</strong> Vesic (1977) 반경험적 방법 및 CFEM (1992) 경험적 방법 동시 비교 산정<br>
                • <strong>수평 지지력/변위 :</strong> Broms 극한평형법 및 Chang 탄성지반반력법 적용
            </div>
        `;
    }

    function updateMethodFormulas() {
        const method = container.querySelector('#pile_method')?.value || 'bored';
        const qpSelect = container.querySelector('#pile_qp_formula');
        const qsSelect = container.querySelector('#pile_qs_formula');
        if (!qpSelect || !qsSelect) return;

        if (method === 'driven') {
            qpSelect.innerHTML = `<option value="driven_standard" selected>항타공법 표준식 (300N)</option>`;
            qpSelect.disabled = true;
            qsSelect.innerHTML = `<option value="road">도로교설계기준해설 (2.0N / 1.0cu)</option><option value="lh">주택공사 지침 (2.0N / 5.0qu)</option>`;
        } else {
            qpSelect.disabled = false;
            qpSelect.innerHTML = `<option value="road" selected>도로교설계기준해설 (200N / 6cu)</option><option value="lh">주택공사 지침 (250N)</option>`;
            qsSelect.innerHTML = `<option value="road" selected>도로교설계기준해설 (2.5N / 0.8cu)</option><option value="lh">주택공사 지침 (2.0N / 5.0qu)</option>`;
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
                        <select id="pile_joint_type" style="flex:1; height:100%; padding:2px;"><option value="weld">용접 이음</option><option value="bolt">볼트 이음</option><option value="none">이음 없음</option></select>
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
                        <select id="pile_joint_type" style="flex:1; height:100%; padding:2px;"><option value="weld">용접 이음</option><option value="bolt">볼트 이음</option><option value="none">이음 없음</option></select>
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
                if (dInput) { dInput.value = (parseFloat(specVal) / 1000).toFixed(3); dInput.readOnly = true; }
                tSelect.innerHTML = `<option value="direct">직접 입력</option><option value="${data.t}">${data.t}mm</option>`;
                tSelect.value = data.t.toString();
                if (tInput) { tInput.value = data.t; tInput.readOnly = true; }
                const phcClass = container.querySelector('#phc_class')?.value || 'A';
                if (grid5Val) grid5Val.value = data[phcClass] || 1730;
            }
        } else if (type === 'STEEL') {
            const data = STEEL_DB[specVal];
            if (data) {
                if (dInput) { dInput.value = (parseFloat(specVal) / 1000).toFixed(3); dInput.readOnly = true; }
                tSelect.innerHTML = `<option value="direct">직접 입력</option>`;
                data.tList.forEach(t => { tSelect.innerHTML += `<option value="${t}">${t}mm</option>`; });
                let defaultT = data.tList.includes(12) ? 12 : data.tList[0];
                tSelect.value = defaultT.toString();
                if (tInput) { tInput.value = defaultT; tInput.readOnly = true; }
                const gradeKey = container.querySelector('#steel_grade')?.value || 'STP275';
                if (grid5Val) grid5Val.value = STEEL_GRADE_MAP[gradeKey] || 275000;
            }
        }
    }

    container.addEventListener('click', (e) => {
        if (e.target.id === 'pile_layer_add') {
            pileLayers.push({ name: `지층${pileLayers.length + 1}`, type: 'sand', dz: 3.0, n_val: 30, gamma: 19.0, c_val: 0, phi: 30, es: 50000 });
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

    container.addEventListener('change', (e) => {
        if (e.target.id === 'pile_type') {
            updateUIState();
            try { localStorage.setItem('geo_pile_type', e.target.value); } catch(err){}
        } else if (e.target.id === 'pile_method') {
            updateMethodFormulas();
            try { localStorage.setItem('geo_pile_method', e.target.value); } catch(err){}
        } else if (e.target.id === 'phc_class' || e.target.id === 'pile_spec_select') {
            applySpecSelection();
        }
        if (e.target.classList.contains('pl-dz')) updatePileLength();
        try { localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers)); } catch(err){}
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
                    <td style="padding:2px;"><input type="text" value="${l.name}" data-idx="${idx}" class="pl-name pl-input"></td>
                    <td style="padding:2px;">
                        <select data-idx="${idx}" class="pl-type pl-input">
                            <option value="sand" ${l.type === 'sand' ? 'selected' : ''}>사질토</option>
                            <option value="clay" ${l.type === 'clay' ? 'selected' : ''}>점성토</option>
                            <option value="gravel" ${l.type === 'gravel' ? 'selected' : ''}>자갈층</option>
                            <option value="weathered_rock" ${l.type === 'weathered_rock' ? 'selected' : ''}>풍화암</option>
                        </select>
                    </td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.dz).toFixed(1)}" data-idx="${idx}" class="pl-dz pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${Math.round(parseFloat(l.n_val))}" data-idx="${idx}" class="pl-n pl-input" step="1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.gamma).toFixed(1)}" data-idx="${idx}" class="pl-gamma pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.c_val).toFixed(1)}" data-idx="${idx}" class="pl-c pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${parseFloat(l.phi).toFixed(1)}" data-idx="${idx}" class="pl-phi pl-input" step="0.1"></td>
                    <td style="padding:2px;"><input type="number" value="${Math.round(parseFloat(l.es))}" data-idx="${idx}" class="pl-es pl-input" step="1"></td>
                    <td style="padding:2px;"><button type="button" class="pl-del" data-idx="${idx}" style="padding:2px 6px; background:#e74c3c; color:#fff; border:none; border-radius:3px;">-</button></td>
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

        let D_val = parseFloat(container.querySelector('#pile_D').value) || 0.500;
        const D = D_val < 5 ? D_val : D_val / 1000.0; // mm 또는 m 구별
        const t_mm = parseFloat(container.querySelector('#pile_t').value) || 80;
        const grid5Val = parseFloat(container.querySelector('#grid5_val').value) || 1730;
        const allow_settle = parseFloat(container.querySelector('#pile_allow_settle')?.value) || 25.0;
        const allow_h_disp = parseFloat(container.querySelector('#pile_allow_h_disp')?.value) || 15.0;
        const user_Ep = parseFloat(container.querySelector('#pile_Ep')?.value) || 39200000;

        const P_norm = parseFloat(container.querySelector('#pile_P_norm').value) || 2062.8;
        const P_seis = parseFloat(container.querySelector('#pile_P_seis').value) || 1728.6;

        const L = calcTotalL();
        const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
        const As = Math.PI * D;

        // 1. 선단지지력 (Qup)
        let lastLayer = pileLayers[pileLayers.length - 1] || { name: '지층7', n_val: 50, c_val: 350, type: 'sand' };
        let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
        let c_tip = parseFloat(lastLayer.c_val) || 0;
        let q_p = 0;

        if (method === 'driven') {
            q_p = 300.0 * Math.min(raw_N_tip, 60);
        } else {
            if (qp_formula_key === 'lh') {
                q_p = 250.0 * Math.min(raw_N_tip, 60);
            } else {
                if (['sand', 'gravel', 'weathered_rock'].includes(lastLayer.type)) {
                    q_p = Math.min(200.0 * raw_N_tip, 12000.0);
                } else {
                    q_p = Math.min(6.0 * c_tip, 12000.0);
                }
            }
        }
        const Qup = q_p * Ap;

        // 2. 주면마찰력 (Qus) 상세 레이어
        let total_Qus = 0;
        let layer_calc_rows = [];
        let c_factor = (method === 'driven') ? 2.0 : (qs_formula_key === 'lh' ? 2.0 : 2.5);
        let c_factor_c = (method === 'driven') ? 1.0 : (qs_formula_key === 'lh' ? 5.0 : 0.8);
        const typeMap = { 'sand': '사질토', 'clay': '점성토', 'gravel': '자갈층', 'weathered_rock': '풍화암' };

        pileLayers.forEach((l, idx) => {
            let dz_i = parseFloat(l.dz) || 0;
            let n_i = parseFloat(l.n_val) || 0;
            let c_i = parseFloat(l.c_val) || 0;
            let gamma_i = parseFloat(l.gamma) || 19.0;
            let isGranular = ['sand', 'gravel', 'weathered_rock'].includes(l.type);

            let f_unit = 0;
            let formula_str = "";

            if (isGranular) {
                let calc_val = c_factor * n_i;
                f_unit = Math.min(100.0, calc_val);
                formula_str = `• 공식: min(100, ${c_factor} &times; N)<br>• 계산: min(100, ${c_factor} &times; ${n_i}) = min(100, ${calc_val.toFixed(1)})<br>• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
            } else {
                let calc_val = c_factor_c * c_i;
                f_unit = Math.min(100.0, calc_val);
                formula_str = `• 공식: min(100, ${c_factor_c} &times; c<sub>u</sub>)<br>• 계산: min(100, ${c_factor_c} &times; ${c_i}) = min(100, ${calc_val.toFixed(1)})<br>• 결과: <strong>${f_unit.toFixed(1)} kN/m²</strong>`;
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

        // 3. 재료 내하력 (Qas)
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
        let mu1 = Math.max(0, L_over_D - 85);
        const Qas = (1.0 - mu1 / 100.0) * Q_mat_base;

        const Q_app_norm = Math.min(Qa_soil_norm, Qas);
        const Q_app_seis = Math.min(Qa_soil_seis, Qas);

        // 4. 경험계수 Cp 및 침하량 상세 계산 (Vesic 1977 & CFEM 1992)
        let isTipSand = ['sand', 'gravel', 'weathered_rock'].includes(lastLayer.type);
        let cp_min = method === 'driven' ? (isTipSand ? 0.02 : 0.02) : (isTipSand ? 0.09 : 0.03);
        let cp_max = method === 'driven' ? (isTipSand ? 0.04 : 0.03) : (isTipSand ? 0.18 : 0.06);
        let Cp = (cp_min + cp_max) / 2.0;
        let Cs = (0.93 + 0.16 * Math.sqrt(L / D)) * Cp;
        let calc_qp = Math.max(q_p, 1.0);

        // (1) 평상시 하중 기준 침하량
        let Qpa_norm = P_norm * (Qup / Qu_total);
        let Qfa_norm = P_norm * (total_Qus / Qu_total);

        let Ss_norm = ((Qpa_norm + 0.67 * Qfa_norm) * L) / (A_net * user_Ep) * 1000.0;
        let Sp_norm = (Cp * Qpa_norm) / (D * calc_qp) * 1000.0;
        let Sps_norm = (Cs * Qfa_norm) / (L * calc_qp) * 1000.0;
        let S_vesic_norm = Ss_norm + Sp_norm + Sps_norm;

        let S_cfem_direct_norm = (D * 1000.0) / 100.0;
        let S_cfem_elastic_norm = (P_norm * L) / (A_net * user_Ep) * 1000.0;
        let S_cfem_norm = S_cfem_direct_norm + S_cfem_elastic_norm;

        // (2) 지진시 하중 기준 침하량
        let Qpa_seis = P_seis * (Qup / Qu_total);
        let Qfa_seis = P_seis * (total_Qus / Qu_total);

        let Ss_seis = ((Qpa_seis + 0.67 * Qfa_seis) * L) / (A_net * user_Ep) * 1000.0;
        let Sp_seis = (Cp * Qpa_seis) / (D * calc_qp) * 1000.0;
        let Sps_seis = (Cs * Qfa_seis) / (L * calc_qp) * 1000.0;
        let S_vesic_seis = Ss_seis + Sp_seis + Sps_seis;

        let S_cfem_direct_seis = (D * 1000.0) / 100.0;
        let S_cfem_elastic_seis = (P_seis * L) / (A_net * user_Ep) * 1000.0;
        let S_cfem_seis = S_cfem_direct_seis + S_cfem_elastic_seis;

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
                            <td style="font-weight:bold; color:#2980b9;">${P_norm.toFixed(1)} kN</td>
                            <td>${Q_app_norm.toFixed(1)} kN</td>
                            <td style="font-weight:bold; color:${P_norm <= Q_app_norm ? '#27ae60' : '#c0392b'};">${P_norm <= Q_app_norm ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                        <tr>
                            <td>내진시 (지진시)</td>
                            <td style="font-weight:bold; color:#2980b9;">${P_seis.toFixed(1)} kN</td>
                            <td>${Q_app_seis.toFixed(1)} kN</td>
                            <td style="font-weight:bold; color:${P_seis <= Q_app_seis ? '#27ae60' : '#c0392b'};">${P_seis <= Q_app_seis ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                        <tr>
                            <td rowspan="2" style="background:#f5eef8; font-weight:bold;">침하량 검토<br><span style="font-size:0.8em; font-weight:normal;">(평상시 하중)</span></td>
                            <td>반경험적 (Vesic)</td>
                            <td style="font-weight:bold; color:#8e44ad;">${S_vesic_norm.toFixed(2)} mm</td>
                            <td rowspan="2" style="vertical-align: middle;">${allow_settle.toFixed(1)} mm</td>
                            <td style="font-weight:bold; color:${S_vesic_norm <= allow_settle ? '#27ae60' : '#c0392b'};">${S_vesic_norm <= allow_settle ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                        <tr>
                            <td>경험적 (CFEM)</td>
                            <td style="font-weight:bold; color:#27ae60;">${S_cfem_norm.toFixed(2)} mm</td>
                            <td style="font-weight:bold; color:${S_cfem_norm <= allow_settle ? '#27ae60' : '#c0392b'};">${S_cfem_norm <= allow_settle ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                        <tr>
                            <td rowspan="2" style="background:#f5eef8; font-weight:bold;">침하량 검토<br><span style="font-size:0.8em; font-weight:normal;">(지진시 하중)</span></td>
                            <td>반경험적 (Vesic)</td>
                            <td style="font-weight:bold; color:#8e44ad;">${S_vesic_seis.toFixed(2)} mm</td>
                            <td rowspan="2" style="vertical-align: middle;">${allow_settle.toFixed(1)} mm</td>
                            <td style="font-weight:bold; color:${S_vesic_seis <= allow_settle ? '#27ae60' : '#c0392b'};">${S_vesic_seis <= allow_settle ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                        <tr>
                            <td>경험적 (CFEM)</td>
                            <td style="font-weight:bold; color:#27ae60;">${S_cfem_seis.toFixed(2)} mm</td>
                            <td style="font-weight:bold; color:${S_cfem_seis <= allow_settle ? '#27ae60' : '#c0392b'};">${S_cfem_seis <= allow_settle ? '안정 (O.K)' : 'NG'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="section-title">[검증 1] 지반에 의한 연직 허용지지력 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px; line-height:1.6;">
                <strong>(1) 말뚝 선단지지력 (Q<sub>up</sub>)</strong><br>
                • 적용 산정식: 도로교설계기준해설 (2008)<br>
                • 최하단 지층(지지층) : ${lastLayer.name} (N = ${raw_N_tip}, c(q<sub>u</sub>) = ${c_tip} kPa)<br>
                • 단위면적당 극한선단지지력 q<sub>p</sub> :<br>
                &nbsp;&nbsp;- 공식: q<sub>p</sub> = min(200 &times; N, 12,000)<br>
                &nbsp;&nbsp;- 계산: min(200 &times; ${raw_N_tip}, 12,000) = min(${(200*raw_N_tip).toLocaleString()}, 12,000)<br>
                &nbsp;&nbsp;- 결과: q<sub>p</sub> = <strong>${q_p.toFixed(1)} kN/m²</strong><br>
                • 선단면적 A<sub>p</sub> 산정식: A<sub>p</sub> = ${frac("&pi; &times; D²", "4")} = ${frac("&pi; &times; " + D.toFixed(3) + "²", "4")} = <strong>${Ap.toFixed(5)} m²</strong><br>
                • <strong>극한선단지지력 Q<sub>up</sub> 산정식 :</strong> Q<sub>up</sub> = q<sub>p</sub> &times; A<sub>p</sub> = ${q_p.toFixed(1)} &times; ${Ap.toFixed(5)} = <span style="font-weight:bold; color:#2980b9;">${Qup.toFixed(1)} kN</span>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px; line-height:1.6;">
                <strong>(2) 말뚝 주면마찰력 (Q<sub>us</sub>)</strong><br>
                • 적용 산정식: 도로교설계기준해설 (2008)<br>
                • 말뚝 둘레 A<sub>s</sub> 산정식: A<sub>s</sub> = &pi; &times; D = &pi; &times; ${D.toFixed(3)} = <strong>${As.toFixed(3)} m</strong><br>
                • <strong>총 극한주면마찰력 Q<sub>us</sub> 산정식 :</strong> Q<sub>us</sub> = &sum; (f<sub>s,i</sub> &times; L<sub>i</sub>) &times; A<sub>s</sub> = <span style="font-weight:bold; color:#2980b9;">${total_Qus.toFixed(1)} kN</span>

                <div class="table-container" style="margin-top: 10px; margin-bottom: 5px;">
                    <table class="result-table" style="font-size: 0.88em; text-align: center;">
                        <thead>
                            <tr style="background-color: #eaeded;">
                                <th>지층명</th>
                                <th>토성구분</th>
                                <th>층후 L<br>(m)</th>
                                <th>N치 / &gamma; / c(q<sub>u</sub>)</th>
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
                                    <td>${r.dz.toFixed(2)}</td>
                                    <td>${Math.round(r.n_val)} / ${r.gamma.toFixed(1)} / ${Math.round(r.c_val)}</td>
                                    <td style="text-align: left; padding: 6px 10px; line-height: 1.45;">${r.formula}</td>
                                    <td>${r.fxL.toFixed(1)}</td>
                                    <td style="font-weight:bold; color:#2980b9;">${r.qusi.toFixed(1)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #f5eef8; font-weight: bold;">
                                <td colspan="6">주면마찰력 합계 (&sum;)</td>
                                <td style="color:#27ae60; font-size:1.05em;">${total_Qus.toFixed(1)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height:1.6;">
                <strong>(3) 지반에 의한 극한지지력 및 허용지지력 (Q<sub>u</sub>, Q<sub>a,soil</sub>)</strong><br>
                • 극한지지력 산정식: Q<sub>u</sub> = Q<sub>up</sub> + Q<sub>us</sub> = ${Qup.toFixed(1)} + ${total_Qus.toFixed(1)} = <strong>${Qu_total.toFixed(1)} kN</strong><br>
                • 평상시 허용지지력 (F.S = 3.0) : Q<sub>a</sub> = ${frac("Q<sub>u</sub>", "3.0")} = ${frac(Qu_total.toFixed(1), "3.0")} = <strong>${Qa_soil_norm.toFixed(1)} kN</strong><br>
                • 내진시 허용지지력 (F.S = 2.0) : Q<sub>a</sub> = ${frac("Q<sub>u</sub>", "2.0")} = ${frac(Qu_total.toFixed(1), "2.0")} = <strong>${Qa_soil_seis.toFixed(1)} kN</strong>
            </div>

            <div class="section-title">[검증 2] 본체부 말뚝 내하력 (재료 허용압축하중 Q<sub>as</sub>) 산정</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px; line-height: 1.6;">
                <strong>• 기본 허용압축하중 (Q<sub>mat_base</sub>) 산정 :</strong><br>
                &nbsp;&nbsp;- 적용 공식: 표준 PHC 말뚝 규격 제원 DB 및 직접 입력값 (P<sub>a</sub>)<br>
                &nbsp;&nbsp;- 산정 결과: Q<sub>mat_base</sub> = P<sub>a</sub> = <strong>${Q_mat_base.toFixed(1)} kN</strong><br>
                <strong>• 장경비 감소율 (&mu;) 산정 :</strong><br>
                &nbsp;&nbsp;- 장경비 L/D = ${frac(L.toFixed(2), D.toFixed(3))} = <strong>${L_over_D.toFixed(2)}</strong> (한계치 n = 85)<br>
                &nbsp;&nbsp;- 장경비에 의한 감소율 &mu; = L/D - n = max(0, ${L_over_D.toFixed(2)} - 85) = <strong>${mu1.toFixed(2)} %</strong><br>
                <strong>• 본체부 말뚝 내하력 계산 :</strong><br>
                &nbsp;&nbsp;- 공식: Q<sub>as</sub> = (1 - ${frac("&mu;", "100")}) &times; Q<sub>mat_base</sub><br>
                &nbsp;&nbsp;- 계산: (1 - ${frac(mu1.toFixed(2), "100")}) &times; ${Q_mat_base.toFixed(1)} = <span style="color:#2980b9; font-weight:bold; font-size:1.05em;">${Qas.toFixed(1)} kN</span>
            </div>

            <div class="section-title">[검증 3] 말뚝 연직침하량 산정 상세 (기성말뚝)</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>■ [참조] 흙의 종류와 말뚝시공법에 따른 경험계수 C<sub>p</sub> 값</strong>
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
                • 선단 지지층 흙 종류: <strong>모래 (조밀~느슨)</strong> / 적용 시공법: <strong>${method === 'bored' ? '굴착말뚝' : '타입말뚝'}</strong><br>
                • 경험계수 C<sub>p</sub> 산정: 평균 산정식: ${frac(cp_min.toFixed(2) + " + " + cp_max.toFixed(2), "2")} = <strong>${Cp.toFixed(3)}</strong>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>(1) 평상시 작용하중 (P<sub>norm</sub> = ${P_norm.toFixed(1)} kN) 기준 침하량</strong><br>
                • 침하량 산정용 전달하중 분배:<br>
                &nbsp;&nbsp;- 선단 전달하중 (Q<sub>pa</sub>) 공식: Q<sub>v</sub> &times; ${frac("Q<sub>up</sub>", "Q<sub>u</sub>")} = ${P_norm.toFixed(1)} &times; ${frac(Qup.toFixed(1), Qu_total.toFixed(1))} = <strong>${Qpa_norm.toFixed(1)} kN</strong><br>
                &nbsp;&nbsp;- 주면 전달하중 (Q<sub>fa</sub>) 공식: Q<sub>v</sub> &times; ${frac("Q<sub>us</sub>", "Q<sub>u</sub>")} = ${P_norm.toFixed(1)} &times; ${frac(total_Qus.toFixed(1), Qu_total.toFixed(1))} = <strong>${Qfa_norm.toFixed(1)} kN</strong><br><br>

                • <strong>반경험적 방법에 의한 침하량 (Vesic, 1977) :</strong><br>
                &nbsp;&nbsp;- 말뚝 자체 압축 (S<sub>s</sub>) = ${frac("(" + Qpa_norm.toFixed(1) + " + 0.67 &times; " + Qfa_norm.toFixed(1) + ") &times; " + L.toFixed(2), A_net.toFixed(5) + " &times; " + user_Ep.toLocaleString())} &times; 1000 = <strong>${Ss_norm.toFixed(3)} mm</strong><br>
                &nbsp;&nbsp;- 선단 전달 침하 (S<sub>p</sub>) = ${frac(Cp.toFixed(3) + " &times; " + Qpa_norm.toFixed(1), D.toFixed(3) + " &times; " + q_p.toFixed(1))} &times; 1000 = <strong>${Sp_norm.toFixed(3)} mm</strong><br>
                &nbsp;&nbsp;- 주면 전달 침하 (S<sub>ps</sub>) = ${frac(Cs.toFixed(4) + " &times; " + Qfa_norm.toFixed(1), L.toFixed(2) + " &times; " + q_p.toFixed(1))} &times; 1000 = <strong>${Sps_norm.toFixed(3)} mm</strong><br>
                &nbsp;&nbsp;▶ <strong>S<sub>vesic,norm</sub></strong> = S<sub>s</sub> + S<sub>p</sub> + S<sub>ps</sub> = <span style="color:#8e44ad; font-weight:bold;">${S_vesic_norm.toFixed(2)} mm</span><br><br>

                • <strong>경험적 방법에 의한 침하량 (CFEM, 1992) :</strong><br>
                &nbsp;&nbsp;- 직경 항 = ${frac(D.toFixed(3), "100")} = <strong>${S_cfem_direct_norm.toFixed(3)} mm</strong><br>
                &nbsp;&nbsp;- 탄성 압축 항 = ${frac(P_norm.toFixed(1) + " &times; " + L.toFixed(2), A_net.toFixed(5) + " &times; " + user_Ep.toLocaleString())} &times; 1000 = <strong>${S_cfem_elastic_norm.toFixed(3)} mm</strong><br>
                &nbsp;&nbsp;▶ <strong>S<sub>cfem,norm</sub></strong> = 직경 항 + 탄성 압축 항 = <span style="color:#27ae60; font-weight:bold;">${S_cfem_norm.toFixed(2)} mm</span>
            </div>

            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px; line-height: 1.6;">
                <strong>(2) 지진시 작용하중 (P<sub>seis</sub> = ${P_seis.toFixed(1)} kN) 기준 침하량</strong><br>
                • 침하량 산정용 전달하중 분배:<br>
                &nbsp;&nbsp;- 선단 전달하중 (Q<sub>pa</sub>) 공식: Q<sub>v</sub> &times; ${frac("Q<sub>up</sub>", "Q<sub>u</sub>")} = ${P_seis.toFixed(1)} &times; ${frac(Qup.toFixed(1), Qu_total.toFixed(1))} = <strong>${Qpa_seis.toFixed(1)} kN</strong><br>
                &nbsp;&nbsp;- 주면 전달하중 (Q<sub>fa</sub>) 공식: Q<sub>v</sub> &times; ${frac("Q<sub>us</sub>", "Q<sub>u</sub>")} = ${P_seis.toFixed(1)} &times; ${frac(total_Qus.toFixed(1), Qu_total.toFixed(1))} = <strong>${Qfa_seis.toFixed(1)} kN</strong><br><br>

                • <strong>반경험적 방법에 의한 침하량 (Vesic, 1977) :</strong><br>
                &nbsp;&nbsp;- 말뚝 자체 압축 (S<sub>s</sub>) = ${frac("(" + Qpa_seis.toFixed(1) + " + 0.67 &times; " + Qfa_seis.toFixed(1) + ") &times; " + L.toFixed(2), A_net.toFixed(5) + " &times; " + user_Ep.toLocaleString())} &times; 1000 = <strong>${Ss_seis.toFixed(3)} mm</strong><br>
                &nbsp;&nbsp;- 선단 전달 침하 (S<sub>p</sub>) = ${frac(Cp.toFixed(3) + " &times; " + Qpa_seis.toFixed(1), D.toFixed(3) + " &times; " + q_p.toFixed(1))} &times; 1000 = <strong>${Sp_seis.toFixed(3)} mm</strong><br>
                &nbsp;&nbsp;- 주면 전달 침하 (S<sub>ps</sub>) = ${frac(Cs.toFixed(4) + " &times; " + Qfa_seis.toFixed(1), L.toFixed(2) + " &times; " + q_p.toFixed(1))} &times; 1000 = <strong>${Sps_seis.toFixed(3)} mm</strong><br>
                &nbsp;&nbsp;▶ <strong>S<sub>vesic,seis</sub></strong> = S<sub>s</sub> + S<sub>p</sub> + S<sub>ps</sub> = <span style="color:#8e44ad; font-weight:bold;">${S_vesic_seis.toFixed(2)} mm</span><br><br>

                • <strong>경험적 방법에 의한 침하량 (CFEM, 1992) :</strong><br>
                &nbsp;&nbsp;- 직경 항 = ${frac(D.toFixed(3), "100")} = <strong>${S_cfem_direct_seis.toFixed(3)} mm</strong><br>
                &nbsp;&nbsp;- 탄성 압축 항 = ${frac(P_seis.toFixed(1) + " &times; " + L.toFixed(2), A_net.toFixed(5) + " &times; " + user_Ep.toLocaleString())} &times; 1000 = <strong>${S_cfem_elastic_seis.toFixed(3)} mm</strong><br>
                &nbsp;&nbsp;▶ <strong>S<sub>cfem,seis</sub></strong> = 직경 항 + 탄성 압축 항 = <span style="color:#27ae60; font-weight:bold;">${S_cfem_seis.toFixed(2)} mm</span>
            </div>
        `;
    }
}
