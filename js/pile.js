export function initPileModule(container) {
    const getVal = (id, defaultVal) => localStorage.getItem('geo_pile_' + id) ?? defaultVal;

    // ---------------------------------------------------------
    // 표준 제원 DB (해설 표 5.2.1 및 강관말뚝 치수표)
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

    let pileLayers = JSON.parse(localStorage.getItem('geo_pile_layers'));
    if (!pileLayers || !Array.isArray(pileLayers) || pileLayers.length === 0) {
        pileLayers = [
            { name: '풍화토(N>40)', type: 'sand', dz: 4.40, n_val: 40, c_val: 25.0 },
            { name: '풍화암', type: 'sand', dz: 5.60, n_val: 40, c_val: 32.0 }
        ];
        localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
    }

    const calcTotalL = () => pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

    const initialType = getVal('type', 'PHC');
    const initialT1 = parseFloat(getVal('t1', '1.0')).toFixed(1);
    const initialMethod = getVal('method', 'bored');

    container.innerHTML = `
        <h3>1. 설계자료 입력 (말뚝기초 연직지지력 검토)</h3>
        
        <!-- Row 1: 말뚝기초 제원 (5개 그리드박스) -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 말뚝기초 제원 및 시공 조건</div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px;">
            <div class="input-group" style="margin:0;">
                <label>말뚝 종류</label>
                <select id="pile_type" style="width:100%; height:32px; box-sizing:border-box; padding:4px; font-size:0.88em;">
                    <option value="PHC" ${initialType === 'PHC' ? 'selected' : ''}>PHC 말뚝</option>
                    <option value="STEEL" ${initialType === 'STEEL' ? 'selected' : ''}>강관 말뚝</option>
                    <option value="CAST" ${initialType === 'CAST' ? 'selected' : ''}>현장타설말뚝</option>
                    <option value="PC" ${initialType === 'PC' ? 'selected' : ''}>PC 말뚝</option>
                    <option value="RC" ${initialType === 'RC' ? 'selected' : ''}>RC 말뚝</option>
                </select>
            </div>

            <div class="input-group" style="margin:0;">
                <label id="grid2_label">세부 구분</label>
                <div id="grid2_content" style="height:32px; display:flex; align-items:center;"></div>
            </div>

            <div class="input-group" style="margin:0;">
                <label>규격 선택 / 직경 D (mm)</label>
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
                <label id="grid5_label" style="font-size: 0.78em; letter-spacing: -0.6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">허용축하중 Pa (kN)</label>
                <input type="number" id="grid5_val" value="${getVal('grid5_val', '1730')}" step="0.1" style="width:100%; height:32px; box-sizing:border-box; padding:4px; text-align:center; font-weight:bold;">
            </div>
        </div>

        <!-- Row 2: 시공 공법 | 선단지지력 식 | 주면마찰력 식 | 이음 방법 및 개소 (4개 그리드박스) -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px;">
            <!-- [1] 시공 공법 선택 (일반 폰트) -->
            <div class="input-group" style="margin:0;">
                <label>시공 공법</label>
                <select id="pile_method" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.88em; font-weight: normal;">
                    <option value="driven" ${initialMethod === 'driven' ? 'selected' : ''}>항타공법</option>
                    <option value="bored" ${initialMethod === 'bored' ? 'selected' : ''}>매입말뚝공법</option>
                </select>
            </div>

            <!-- [2] 선단지지력 산정식 선택 -->
            <div class="input-group" style="margin:0;">
                <label>선단지지력 산정식</label>
                <select id="pile_qp_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em; font-weight: normal;"></select>
            </div>

            <!-- [3] 주면마찰력 산정식 선택 -->
            <div class="input-group" style="margin:0;">
                <label>주면마찰력 산정식</label>
                <select id="pile_qs_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em; font-weight: normal;"></select>
            </div>

            <!-- [4] 이음 방법 및 개소 -->
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
        </div>

        <!-- 하단 실시간 산정식 구분 표시 안내 박스 -->
        <div id="formula_info_box" style="margin-bottom: 15px; font-size: 0.83em; color: #2c3e50; background: #f4f6f7; padding: 8px 12px; border-radius: 4px; border-left: 4px solid #16a085;"></div>

        <!-- 2. 작용 하중 입력 -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400; font-size: 0.95em;">■ 작용 하중 (상부구조 반력)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99;">
            <div class="input-group" style="background:#fff;">
                <label style="color:#d35400;">평상시 P_norm (kN/본)</label>
                <input type="number" id="pile_P_norm" value="${getVal('P_norm', '2062.8')}" step="0.1">
            </div>
            <div class="input-group" style="background:#fff;">
                <label style="color:#c0392b;">내진시 P_seis (kN/본)</label>
                <input type="number" id="pile_P_seis" value="${getVal('P_seis', '1728.6')}" step="0.1">
            </div>
        </div>

        <!-- 3. 주면마찰력 산정을 위한 지층 정보 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-weight: bold; color: #27ae60; font-size: 0.95em;">■ 지층 정보 (최하단 지층 평균 N치가 선단지지력에 자동 사용됨)</div>
            <button type="button" id="pile_layer_add" style="padding: 4px 10px; background: #27ae60; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85em; font-weight: bold;">+ 지층 추가</button>
        </div>
        
        <div style="background-color: #e8f8f5; padding: 12px; border-radius: 6px; border: 1px solid #a3e4d7; margin-bottom: 15px;">
            <div class="table-container" style="margin: 0;">
                <table class="result-table" style="font-size: 0.85em; text-align: center; margin: 0; width: 100%; table-layout: fixed;">
                    <thead>
                        <tr style="background-color: #d1f2eb;">
                            <th style="width: 24%; padding: 6px;">지층명</th>
                            <th style="width: 24%; padding: 6px;">토성 구분</th>
                            <th style="width: 16%; padding: 6px;">층후 L (m)</th>
                            <th style="width: 14%; padding: 6px;">평균 N치</th>
                            <th style="width: 14%; padding: 6px;">점착력 c (kN/m²)</th>
                            <th style="width: 8%; padding: 6px;">삭제</th>
                        </tr>
                    </thead>
                    <tbody id="pile_layers_body"></tbody>
                    <tfoot>
                        <tr style="background-color: #ebf5fb; font-weight: bold; border-top: 2px solid #a3e4d7;">
                            <td colspan="2" style="padding: 8px 6px; text-align: right; color: #2980b9;">말뚝 총 길이 L (m) :</td>
                            <td id="pile_L_val" style="padding: 8px 6px; color: #16a085; font-size: 1.05em; text-align: center;">${calcTotalL().toFixed(2)}</td>
                            <td colspan="3" style="padding: 8px 6px; text-align: left; color: #7f8c8d; font-size: 0.85em;">(지층 층후 자동 합산)</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <button class="action-btn" id="calc-pile-btn" style="margin-top: 10px;">말뚝 연직지지력 산정 및 검토</button>
        <div id="pile-result" class="result-box"></div>
    `;

    // ---------------------------------------------------------
    // UI 동적 제어 및 산정식 구체 표기 안내
    // ---------------------------------------------------------
    function updateFormulaInfoText() {
        const method = document.getElementById('pile_method').value;
        const qpVal = document.getElementById('pile_qp_formula').value;
        const qsVal = document.getElementById('pile_qs_formula').value;
        const infoBox = document.getElementById('formula_info_box');

        if (!infoBox) return;

        let qpText = "";
        let qsText = "";

        if (method === 'driven') {
            qpText = "300·N (사질토, N≤60, 상한 15,000 kN/m²) / 6·c_u (점성토, 상한 12,000 kN/m²)";
            qsText = "2.0·N (사질토, 상한 100 kN/m²), 1.0·c_u (점성토, 상한 100 kN/m²)";
        } else {
            if (qpVal === 'lh') {
                qpText = "250·N (N≤60)";
            } else {
                qpText = "200·N (사질토, 상한 12,000 kN/m²), 6·c_u (점성토, 상한 12,000 kN/m²)";
            }

            if (qsVal === 'lh') {
                qsText = "2.0·N (사질토), 5.0·q_u (점성토, q_u=2c_u)";
            } else {
                qsText = "2.5·N (사질토, N≤50), 0.8·c_u (점성토, c_u≤125)";
            }
        }

        infoBox.innerHTML = `
            <div style="font-weight: bold; color: #16a085; margin-bottom: 2px;">▶ 적용 산정식</div>
            <div style="margin-left: 6px; line-height: 1.5;">
                • <strong>선단지지력 :</strong> ${qpText} <span style="color:#7f8c8d; font-size:0.9em;">(최하단 지층 토성구분 기준)</span><br>
                • <strong>주면마찰력 :</strong> ${qsText} <span style="color:#7f8c8d; font-size:0.9em;">(각 지층별 토성구분 기준)</span>
            </div>
        `;
    }

    function updateMethodFormulas() {
        const method = document.getElementById('pile_method').value;
        const qpSelect = document.getElementById('pile_qp_formula');
        const qsSelect = document.getElementById('pile_qs_formula');

        const savedQp = getVal('qp_formula', 'road');
        const savedQs = getVal('qs_formula', 'road');

        if (method === 'driven') {
            qpSelect.innerHTML = `<option value="driven_standard" selected>항타공법 표준식</option>`;
            qpSelect.disabled = true;

            qsSelect.innerHTML = `<option value="driven_standard" selected>항타공법 표준식</option>`;
            qsSelect.disabled = true;
        } else {
            qpSelect.disabled = false;
            qpSelect.innerHTML = `
                <option value="road" ${savedQp === 'road' ? 'selected' : ''}>도로교설계기준해설 (2008)</option>
                <option value="lh" ${savedQp === 'lh' ? 'selected' : ''}>주택공사 설계개선지침 (2008)</option>
            `;

            qsSelect.disabled = false;
            qsSelect.innerHTML = `
                <option value="road" ${savedQs === 'road' ? 'selected' : ''}>도로교설계기준해설 (2008)</option>
                <option value="lh" ${savedQs === 'lh' ? 'selected' : ''}>주택공사 설계개선지침 (2008)</option>
            `;
        }

        updateFormulaInfoText();
    }

    function updateUIState() {
        const type = document.getElementById('pile_type').value;
        const grid2Label = document.getElementById('grid2_label');
        const grid2Content = document.getElementById('grid2_content');
        const grid5Label = document.getElementById('grid5_label');
        const grid5Val = document.getElementById('grid5_val');
        const specSelect = document.getElementById('pile_spec_select');

        specSelect.innerHTML = '';

        if (type === 'PHC') {
            grid2Label.textContent = 'PHC 종 구분';
            grid2Content.innerHTML = `
                <select id="phc_class" style="width:100%; height:100%; box-sizing:border-box; padding:4px; font-size:0.88em;">
                    <option value="A">A종</option>
                    <option value="B">B종</option>
                    <option value="C">C종</option>
                </select>
            `;
            grid5Label.textContent = '허용축하중 Pa (kN)';

            specSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            Object.keys(PHC_DB).forEach(d => {
                specSelect.innerHTML += `<option value="${d}">D${d}</option>`;
            });
            specSelect.value = '500';

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
            grid5Label.textContent = '허용압축응력 σ_ca (kN/m²)';

            specSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            Object.keys(STEEL_DB).forEach(d => {
                const dispD = STEEL_DB[d].displayD;
                specSelect.innerHTML += `<option value="${d}">D${dispD}</option>`;
            });
            specSelect.value = '508.0';

        } else {
            grid2Label.textContent = '세부 구분';
            grid2Content.innerHTML = `<span style="color:#aaa; font-size:0.85em; width:100%; text-align:center;">- (없음) -</span>`;
            grid5Label.textContent = '허용압축응력 σ_ca (MPa)';
            specSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            grid5Val.value = (type === 'CAST') ? '35.0' : '80.0';
        }

        applySpecSelection();
        updateMethodFormulas();
    }

    function applySpecSelection() {
        const type = document.getElementById('pile_type').value;
        const specVal = document.getElementById('pile_spec_select').value;
        const dInput = document.getElementById('pile_D');
        const tInput = document.getElementById('pile_t');
        const tSelect = document.getElementById('pile_t_select');
        const grid5Val = document.getElementById('grid5_val');

        tSelect.innerHTML = '';

        if (specVal === 'direct') {
            dInput.readOnly = false;
            tSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            tInput.readOnly = false;
            return;
        }

        if (type === 'PHC') {
            const data = PHC_DB[specVal];
            if (data) {
                dInput.value = Math.round(parseFloat(specVal));
                dInput.readOnly = true;

                tSelect.innerHTML = `<option value="direct">직접 입력</option>
                                     <option value="${data.t}">${data.t}mm</option>`;
                tSelect.value = data.t.toString();
                tInput.value = data.t;
                tInput.readOnly = true;

                const phcClass = document.getElementById('phc_class')?.value || 'A';
                grid5Val.value = data[phcClass] || 1730;
            }
        } else if (type === 'STEEL') {
            const data = STEEL_DB[specVal];
            if (data) {
                dInput.value = parseFloat(specVal).toFixed(1);
                dInput.readOnly = true;

                tSelect.innerHTML = `<option value="direct">직접 입력</option>`;
                data.tList.forEach(t => {
                    tSelect.innerHTML += `<option value="${t}">${t}mm</option>`;
                });

                let defaultT = data.tList.includes(12) ? 12 : data.tList[0];
                tSelect.value = defaultT.toString();
                tInput.value = defaultT;
                tInput.readOnly = true;

                const gradeKey = document.getElementById('steel_grade')?.value || 'STP275';
                grid5Val.value = STEEL_GRADE_MAP[gradeKey] || 275000;
            }
        } else {
            dInput.readOnly = false;
            tSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            tInput.readOnly = false;
        }
    }

    function applyThicknessSelection() {
        const tSelect = document.getElementById('pile_t_select');
        const tInput = document.getElementById('pile_t');
        if (!tSelect || !tInput) return;

        if (tSelect.value === 'direct') {
            tInput.readOnly = false;
        } else {
            tInput.value = tSelect.value;
            tInput.readOnly = true;
        }
    }

    // ---------------------------------------------------------
    // 이벤트 바인딩
    // ---------------------------------------------------------
    container.addEventListener('change', (e) => {
        if (e.target.id === 'pile_type') {
            updateUIState();
            localStorage.setItem('geo_pile_type', e.target.value);
        } else if (e.target.id === 'pile_method') {
            updateMethodFormulas();
            localStorage.setItem('geo_pile_method', e.target.value);
        } else if (e.target.id === 'phc_class' || e.target.id === 'pile_spec_select') {
            applySpecSelection();
        } else if (e.target.id === 'pile_t_select') {
            applyThicknessSelection();
        } else if (e.target.id === 'steel_grade') {
            const gradeKey = e.target.value;
            document.getElementById('grid5_val').value = STEEL_GRADE_MAP[gradeKey] || 275000;
        } else if (e.target.id === 'pile_qp_formula') {
            localStorage.setItem('geo_pile_qp_formula', e.target.value);
            updateFormulaInfoText();
        } else if (e.target.id === 'pile_qs_formula') {
            localStorage.setItem('geo_pile_qs_formula', e.target.value);
            updateFormulaInfoText();
        }
    });

    updateUIState();

    function updatePileLength() {
        const totalL = calcTotalL();
        const pileLVal = document.getElementById('pile_L_val');
        if (pileLVal) {
            pileLVal.textContent = totalL.toFixed(2);
            localStorage.setItem('geo_pile_L', totalL.toFixed(2));
        }
    }

    function renderLayers() {
        const tbody = document.getElementById('pile_layers_body');
        if (!tbody) return;
        tbody.innerHTML = '';
        pileLayers.forEach((l, idx) => {
            tbody.innerHTML += `
                <tr>
                    <td style="padding:4px;"><input type="text" value="${l.name}" data-idx="${idx}" class="pl-name" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;">
                        <select data-idx="${idx}" class="pl-type" style="width:100%; box-sizing:border-box; padding:4px;">
                            <option value="sand" ${l.type === 'sand' ? 'selected' : ''}>사질토 / 풍화암</option>
                            <option value="clay" ${l.type === 'clay' ? 'selected' : ''}>점성토</option>
                        </select>
                    </td>
                    <td style="padding:4px;"><input type="number" value="${l.dz.toFixed(2)}" data-idx="${idx}" class="pl-dz" step="0.1" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${l.n_val}" data-idx="${idx}" class="pl-n" step="1" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${l.c_val.toFixed(1)}" data-idx="${idx}" class="pl-c" step="0.5" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><button type="button" class="pl-del" data-idx="${idx}" style="padding:3px 8px; background:#e74c3c; color:#fff; border:none; border-radius:3px; cursor:pointer;">-</button></td>
                </tr>
            `;
        });
        updatePileLength();
    }
    renderLayers();

    container.addEventListener('change', (e) => {
        if (e.target.classList.contains('pl-name')) pileLayers[e.target.dataset.idx].name = e.target.value;
        if (e.target.classList.contains('pl-type')) pileLayers[e.target.dataset.idx].type = e.target.value;
        if (e.target.classList.contains('pl-dz')) {
            pileLayers[e.target.dataset.idx].dz = parseFloat(e.target.value) || 0;
            updatePileLength();
        }
        if (e.target.classList.contains('pl-n')) pileLayers[e.target.dataset.idx].n_val = parseFloat(e.target.value) || 0;
        if (e.target.classList.contains('pl-c')) pileLayers[e.target.dataset.idx].c_val = parseFloat(e.target.value) || 0;
        localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
    });

    container.addEventListener('click', (e) => {
        if (e.target.id === 'pile_layer_add') {
            pileLayers.push({ name: '신규지층', type: 'sand', dz: 3.0, n_val: 30, c_val: 0 });
            localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
            renderLayers();
        }
        if (e.target.classList.contains('pl-del')) {
            pileLayers.splice(e.target.dataset.idx, 1);
            localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
            renderLayers();
        }
    });

    container.querySelector('#calc-pile-btn').addEventListener('click', calculatePileCapacity);
}

// ---------------------------------------------------------
// 연직지지력 산정 핵심 함수
// ---------------------------------------------------------
function calculatePileCapacity() {
    const p_type = document.getElementById('pile_type').value;
    const method = document.getElementById('pile_method').value;
    const qp_formula = document.getElementById('pile_qp_formula').value;
    const qs_formula = document.getElementById('pile_qs_formula').value;

    const D_mm = parseFloat(document.getElementById('pile_D').value) || 500;
    const D = D_mm / 1000.0;

    const t_mm = parseFloat(document.getElementById('pile_t').value);
    const grid5Val = parseFloat(document.getElementById('grid5_val').value) || 0;

    let t1_mm = 0;
    if (p_type === 'STEEL') {
        const t1Elem = document.getElementById('pile_t1');
        if (t1Elem) t1_mm = parseFloat(t1Elem.value) || 0;
    }

    let pileLayers = JSON.parse(localStorage.getItem('geo_pile_layers')) || [];
    const L = pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

    const joint_type = document.getElementById('pile_joint_type').value;
    const joint_cnt = parseInt(document.getElementById('pile_joint_count').value) || 0;

    const P_norm = parseFloat(document.getElementById('pile_P_norm').value);
    const P_seis = parseFloat(document.getElementById('pile_P_seis').value);

    // 1. 선단지지력 (Qup) - 최하단 지층 토성구분 기준
    let lastLayer = pileLayers.length > 0 ? pileLayers[pileLayers.length - 1] : { name: '지지층', type: 'sand', n_val: 50, c_val: 0 };
    let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
    let c_tip = parseFloat(lastLayer.c_val) || 0;

    const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
    
    let q_p = 0; 
    let qp_formula_name = "";
    let qp_calc_detail = "";

    if (method === 'driven') {
        qp_formula_name = "항타공법 산정식";
        if (lastLayer.type === 'sand') {
            let N_used = Math.min(raw_N_tip, 60);
            q_p = Math.min(300.0 * N_used, 15000.0);
            qp_calc_detail = `min(300 &times; N, 15,000) = min(300 &times; ${N_used}, 15,000) = <strong>${q_p.toFixed(1)} kN/m²</strong> (사질토 적용)`;
        } else {
            q_p = Math.min(6.0 * c_tip, 12000.0);
            qp_calc_detail = `min(6 &times; c_u, 12,000) = min(6 &times; ${c_tip}, 12,000) = <strong>${q_p.toFixed(1)} kN/m²</strong> (점성토 적용)`;
        }
    } else {
        if (qp_formula === 'lh') {
            qp_formula_name = "매입말뚝 - 주택공사 설계개선지침 (2008)";
            let N_used = Math.min(raw_N_tip, 60);
            q_p = 250.0 * N_used;
            qp_calc_detail = `250 &times; N (${N_used}) = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
        } else {
            qp_formula_name = "매입말뚝 - 도로교설계기준해설 (2008)";
            if (lastLayer.type === 'sand') {
                q_p = Math.min(200.0 * raw_N_tip, 12000.0);
                qp_calc_detail = `min(200 &times; N, 12,000) = min(200 &times; ${raw_N_tip}, 12,000) = <strong>${q_p.toFixed(1)} kN/m²</strong> (사질토 적용)`;
            } else {
                q_p = Math.min(6.0 * c_tip, 12000.0);
                qp_calc_detail = `min(6 &times; c_u, 12,000) = min(6 &times; ${c_tip}, 12,000) = <strong>${q_p.toFixed(1)} kN/m²</strong> (점성토 적용)`;
            }
        }
    }

    const Qup = q_p * Ap;

    // 2. 주면마찰력 (Qus) - 각 지층별 토성구분 기준
    const As = Math.PI * D;
    let total_Qus = 0;
    let layer_calc_rows = [];
    let qs_formula_name = "";

    if (method === 'driven') {
        qs_formula_name = "항타공법 산정식";
    } else {
        qs_formula_name = qs_formula === 'lh' ? "매입말뚝 - 주택공사 설계개선지침 (2008)" : "매입말뚝 - 도로교설계기준해설 (2008)";
    }

    pileLayers.forEach(l => {
        let f_unit = 0;
        let formula_str = "";

        if (method === 'driven') {
            if (l.type === 'sand') {
                f_unit = Math.min(2.0 * l.n_val, 100.0);
                formula_str = `min(2.0 &times; N, 100) = ${f_unit.toFixed(1)}`;
            } else {
                f_unit = Math.min(1.0 * l.c_val, 100.0);
                formula_str = `min(1.0 &times; c_u, 100) = ${f_unit.toFixed(1)}`;
            }
        } else {
            if (qs_formula === 'lh') {
                if (l.type === 'sand') {
                    f_unit = 2.0 * l.n_val;
                    formula_str = `2.0 &times; N = ${f_unit.toFixed(1)}`;
                } else {
                    let q_u = 2.0 * l.c_val;
                    f_unit = 5.0 * q_u;
                    formula_str = `5.0 &times; q_u = ${f_unit.toFixed(1)}`;
                }
            } else {
                if (l.type === 'sand') {
                    let N_lim = Math.min(l.n_val, 50.0);
                    f_unit = 2.5 * N_lim;
                    formula_str = `2.5 &times; N = ${f_unit.toFixed(1)}`;
                } else {
                    let c_lim = Math.min(l.c_val, 125.0);
                    f_unit = 0.8 * c_lim;
                    formula_str = `0.8 &times; c_u = ${f_unit.toFixed(1)}`;
                }
            }
        }

        let fxL = f_unit * l.dz;
        let Qus_i = fxL * As;
        total_Qus += Qus_i;

        layer_calc_rows.push({
            name: l.name,
            type: l.type === 'sand' ? '사질토' : '점성토',
            dz: l.dz,
            n_val: l.n_val,
            c_val: l.c_val,
            formula: formula_str,
            f_unit: f_unit,
            fxL: fxL,
            qusi: Qus_i
        });
    });

    // 3. 지반 허용지지력 (Qa_soil)
    const Qu_total = Qup + total_Qus;
    const Qa_soil_norm = Qu_total / 3.0;
    const Qa_soil_seis = Qa_soil_norm * 1.25;

    // 4. 재료 허용압축하중 (Qas)
    const D_out = D - (t1_mm / 1000.0);
    const D_in = Math.max(0, D - 2.0 * (t_mm / 1000.0));
    const A_net = (Math.PI * (Math.pow(D_out, 2) - Math.pow(D_in, 2))) / 4.0;

    let Q_mat_base = 0;
    let qMatBaseDetailStr = "";

    if (p_type === 'PHC') {
        Q_mat_base = grid5Val;
        qMatBaseDetailStr = `• 기본 허용압축하중 Q<sub>mat_base</sub> = <strong>${Q_mat_base.toFixed(1)} kN</strong> (해설 표 5.2.1 표준 허용축하중 적용)`;
    } else if (p_type === 'STEEL') {
        Q_mat_base = grid5Val * A_net;
        qMatBaseDetailStr = `• 기본 허용압축하중 Q<sub>mat_base</sub> = &sigma;<sub>ca</sub> &times; A<sub>net</sub> = ${grid5Val.toLocaleString()} kN/m² &times; ${A_net.toFixed(5)} m² = <strong>${Q_mat_base.toFixed(1)} kN</strong>`;
    } else {
        Q_mat_base = grid5Val * 1000.0 * A_net;
        qMatBaseDetailStr = `• 기본 허용압축하중 Q<sub>mat_base</sub> = &sigma;<sub>ca</sub> &times; A<sub>net</sub> &times; 1000 = ${grid5Val.toFixed(1)} MPa &times; ${A_net.toFixed(5)} m² &times; 1000 = <strong>${Q_mat_base.toFixed(1)} kN</strong>`;
    }

    const L_over_D = L / D;
    let n_limit = 85; 
    if (p_type === 'PC') n_limit = 80;
    else if (p_type === 'RC') n_limit = 70;
    else if (p_type === 'STEEL') n_limit = 100;
    else if (p_type === 'CAST') n_limit = 60;

    let mu1 = Math.max(0, L_over_D - n_limit);

    let mu2_base = 0;
    if (joint_type === 'weld') mu2_base = 5.0;
    else if (joint_type === 'bolt') mu2_base = 10.0;
    
    let mu2 = (method === 'bored') ? (mu2_base * 0.5 * joint_cnt) : (mu2_base * joint_cnt);

    const Qas = (1.0 - (mu1 + mu2) / 100.0) * Q_mat_base;

    // 5. 안전성 검토
    const Q_app_norm = Math.min(Qa_soil_norm, Qas);
    const Q_app_seis = Math.min(Qa_soil_seis, Qas);

    const status_norm = P_norm <= Q_app_norm ? "안정 (O.K)" : "NG";
    const status_seis = P_seis <= Q_app_seis ? "안정 (O.K)" : "NG";

    // 6. 결과 렌더링
    const resultDiv = document.getElementById('settlement-result') || document.getElementById('pile-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="section-title">[말뚝기초 연직지지력 최종 검토 요약]</div>
        <div class="table-container">
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>구분</th>
                        <th>지반 허용지지력 (kN)</th>
                        <th>재료 허용지지력 (kN)</th>
                        <th>적용 허용지지력 (kN)</th>
                        <th>작용하중 (kN)</th>
                        <th>검토 결과</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>평상시 (상시)</strong></td>
                        <td>${Qa_soil_norm.toFixed(1)}</td>
                        <td rowspan="2" style="vertical-align: middle; font-weight:bold; color:#8e44ad;">${Qas.toFixed(1)}<br><span style="font-size:0.8em; font-weight:normal; color:#7f8c8d;">(단일값 적용)</span></td>
                        <td style="font-weight:bold; color:#2980b9;">${Q_app_norm.toFixed(1)}</td>
                        <td>${P_norm.toFixed(1)}</td>
                        <td style="font-weight:bold; color:${status_norm.includes('안정') ? '#27ae60' : '#c0392b'};">${status_norm}</td>
                    </tr>
                    <tr>
                        <td><strong>내진시 (지진시)</strong></td>
                        <td>${Qa_soil_seis.toFixed(1)}</td>
                        <td style="font-weight:bold; color:#2980b9;">${Q_app_seis.toFixed(1)}</td>
                        <td>${P_seis.toFixed(1)}</td>
                        <td style="font-weight:bold; color:${status_seis.includes('안정') ? '#27ae60' : '#c0392b'};">${status_seis}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section-title">[검증 1] 지반에 의한 연직 허용지지력 산정 (구조물기초설계기준 해설)</div>
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
            <strong>(1) 말뚝 선단지지력 (Q<sub>up</sub>)</strong><br>
            • 적용 산정식 : <strong>${qp_formula_name}</strong><br>
            • 최하단 지층 및 토성구분 : <strong>${lastLayer.name}</strong> (${lastLayer.type === 'sand' ? '사질토' : '점성토'}, N = ${raw_N_tip}, c = ${c_tip} kN/m²)<br>
            • 단위면적당 극한선단지지력 q<sub>p</sub> = ${qp_calc_detail}<br>
            • 선단면적 A<sub>p</sub> = &pi; &times; D² / 4 = &pi; &times; ${D.toFixed(3)}² / 4 = <strong>${Ap.toFixed(5)} m²</strong> (D = ${D_mm.toFixed(1)}mm)<br>
            • <strong>극한선단지지력 Q<sub>up</sub></strong> = q<sub>p</sub> &times; A<sub>p</sub> = ${q_p.toFixed(1)} &times; ${Ap.toFixed(5)} = <span style="font-weight:bold; color:#8e44ad;">${Qup.toFixed(1)} kN</span><br><br>

            <strong>(2) 말뚝 주면마찰력 (Q<sub>us</sub>)</strong><br>
            • 적용 산정식 : <strong>${qs_formula_name}</strong><br>
            • 말뚝 둘레 A<sub>s</sub> = &pi; &times; D = &pi; &times; ${D.toFixed(3)} = <strong>${As.toFixed(3)} m</strong><br>
            • <strong>총 극한주면마찰력 Q<sub>us</sub></strong> = &sum; (f<sub>s</sub> &times; L) &times; A<sub>s</sub> = <strong>${total_Qus.toFixed(1)} kN</strong>
        </div>

        <div class="table-container" style="margin-bottom: 15px;">
            <table class="result-table" style="font-size: 0.8em; text-align: center;">
                <thead>
                    <tr style="background-color: #eaeded;">
                        <th>지층명</th>
                        <th>토성구분</th>
                        <th>층후 L (m)</th>
                        <th>N치 / c</th>
                        <th>단위 마찰력 f<sub>s</sub> (kN/m²)</th>
                        <th>f<sub>s</sub> &times; L</th>
                        <th>층별 주면마찰력 Q<sub>us,i</sub> (kN)</th>
                    </tr>
                </thead>
                <tbody>
                    ${layer_calc_rows.map(r => `
                        <tr>
                            <td>${r.name}</td>
                            <td>${r.type}</td>
                            <td>${r.dz.toFixed(2)}</td>
                            <td>${r.n_val} / ${r.c_val}</td>
                            <td>${r.formula}</td>
                            <td>${r.fxL.toFixed(1)}</td>
                            <td style="font-weight:bold;">${r.qusi.toFixed(1)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f5eef8; font-weight: bold;">
                        <td colspan="6">주면마찰력 합계 (&sum;)</td>
                        <td style="color:#27ae60;">${total_Qus.toFixed(1)} kN</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px;">
            <strong>(3) 지반 허용지지력 (Q<sub>a,soil</sub>)</strong><br>
            • 평상시 (F.S = 3.0) : (Q<sub>up</sub> + Q<sub>us</sub>) / 3.0 = (${Qup.toFixed(1)} + ${total_Qus.toFixed(1)}) / 3.0 = <strong>${Qa_soil_norm.toFixed(1)} kN</strong><br>
            • 내진시 : 평상시 허용지지력 &times; 1.25 = ${Qa_soil_norm.toFixed(1)} &times; 1.25 = <strong>${Qa_soil_seis.toFixed(1)} kN</strong>
        </div>

        <div class="section-title">[검증 2] 말뚝 재료에 의한 허용압축하중 산정 (구조물기초설계기준 해설)</div>
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px;">
            • 말뚝 외경 D<sub>out</sub> : D - 부식t<sub>1</sub> = ${D.toFixed(4)}m ${p_type === 'STEEL' ? '- ' + (t1_mm/1000.0).toFixed(4) + 'm = ' + D_out.toFixed(4) + 'm' : '= ' + D_out.toFixed(4) + 'm'}<br>
            • 말뚝 내경 D<sub>in</sub> : D - 2 &times; t = ${D.toFixed(4)}m - 2 &times; ${(t_mm/1000.0).toFixed(4)}m = <strong>${D_in.toFixed(4)} m</strong><br>
            • 유효 단면적 A<sub>net</sub> = &pi; &times; (D<sub>out</sub>² - D<sub>in</sub>²) / 4 = &pi; &times; (${D_out.toFixed(4)}² - ${D_in.toFixed(4)}²) / 4 = <strong>${A_net.toFixed(5)} m²</strong><br>
            ${qMatBaseDetailStr}<br><br>
            • 산정 공식 : Q<sub>as</sub> = [1 - (&mu;<sub>1</sub> + &mu;<sub>2</sub>)/100] &times; Q<sub>mat_base</sub><br>
            • 장경비 L/D = ${L.toFixed(2)} / ${D.toFixed(3)} = ${L_over_D.toFixed(2)} (한계치 n = ${n_limit}) &rarr; 장경비 저감율 &mu;<sub>1</sub> = <strong>${mu1.toFixed(1)} %</strong><br>
            • 이음 저감율 &mu;<sub>2</sub> = <strong>${mu2.toFixed(1)} %</strong> (${joint_type === 'none' ? '이음없음' : joint_type + ' ' + joint_cnt + '개소'}${method === 'bored' ? ', 매입말뚝 손상감소율 1/2 적용' : ''})<br>
            • <strong>최종 재료 허용압축하중 Q<sub>as</sub></strong> = [1 - ${(mu1 + mu2).toFixed(1)}/100] &times; ${Q_mat_base.toFixed(1)} = <span style="color:#8e44ad; font-weight:bold;">${Qas.toFixed(1)} kN</span>
        </div>

        <div style="font-weight: bold; margin-bottom: 6px; color: #2c3e50; font-size: 0.85em;">■ 표 3. 장경비에 의한 허용응력 감소의 한계치 (구조물기초설계기준 해설 표 5.2.3)</div>
        <div class="table-container" style="margin-bottom: 15px;">
            <table class="result-table" style="font-size: 0.8em; text-align: center;">
                <thead>
                    <tr style="background-color: #eaeded;">
                        <th>구 분</th>
                        <th>RC말뚝</th>
                        <th>PC말뚝</th>
                        <th>PHC말뚝</th>
                        <th>강관말뚝</th>
                        <th>현장타설말뚝</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>n</strong></td>
                        <td style="${p_type === 'RC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">70</td>
                        <td style="${p_type === 'PC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">80</td>
                        <td style="${p_type === 'PHC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">85</td>
                        <td style="${p_type === 'STEEL' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">100</td>
                        <td style="${p_type === 'CAST' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">60</td>
                    </tr>
                    <tr>
                        <td><strong>장경비의 상한계<sup>1)</sup></strong></td>
                        <td style="${p_type === 'RC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">90</td>
                        <td style="${p_type === 'PC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">105</td>
                        <td style="${p_type === 'PHC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">110</td>
                        <td style="${p_type === 'STEEL' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">130</td>
                        <td style="${p_type === 'CAST' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">80</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="font-weight: bold; margin-bottom: 6px; color: #2c3e50; font-size: 0.85em;">■ 표 4. 말뚝이음에 의한 허용하중 감소율 (구조물기초설계기준 해설 표 5.2.2)</div>
        <div class="table-container">
            <table class="result-table" style="font-size: 0.8em; text-align: center;">
                <thead>
                    <tr style="background-color: #eaeded;">
                        <th>이음방법</th>
                        <th>용접이음</th>
                        <th>볼트식 이음</th>
                        <th>비고</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>감소율</strong></td>
                        <td style="${joint_type === 'weld' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">5% / 개소</td>
                        <td style="${joint_type === 'bolt' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">10% / 개소</td>
                        <td style="text-align:left; font-size:0.85em; padding:4px 8px;">매입말뚝 경우에는 이음부 손상이 거의 없으므로 이음방법별 감소율 절반(1/2) 적용</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}
