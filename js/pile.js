export function initPileModule(container) {
    const getVal = (id, defaultVal) => {
        try {
            return localStorage.getItem('geo_pile_' + id) ?? defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

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

    let pileLayers;
    try {
        pileLayers = JSON.parse(localStorage.getItem('geo_pile_layers'));
    } catch (e) {
        pileLayers = null;
    }

    if (!pileLayers || !Array.isArray(pileLayers) || pileLayers.length === 0) {
        pileLayers = [
            { name: '지층1', type: 'sand', dz: 4.40, n_val: 40, gamma: 19.0, c_val: 25.0 },
            { name: '지층2', type: 'rock', dz: 5.60, n_val: 50, gamma: 20.0, c_val: 30000.0 }
        ];
        try {
            localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
        } catch (e) {}
    }

    const calcTotalL = () => pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

    const initialType = getVal('type', 'PHC');
    const initialT1 = parseFloat(getVal('t1', '1.0')).toFixed(1);
    const initialMethod = getVal('method', 'bored');
    const initialGWT = getVal('gwt', '2.0');

    container.innerHTML = `
        <h3>1. 설계자료 입력 (말뚝기초 연직지지력 검토)</h3>
        
        <!-- Row 1: 말뚝기초 제원 -->
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
                <label id="grid5_label" style="font-size: 0.78em; letter-spacing: -0.6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">허용축하중 Pa (kN)</label>
                <input type="number" id="grid5_val" value="${getVal('grid5_val', '1730')}" step="0.1" style="width:100%; height:32px; box-sizing:border-box; padding:4px; text-align:center; font-weight:bold;">
            </div>
        </div>

        <!-- Row 2: 시공 공법 등 -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px;">
            <div class="input-group" style="margin:0;">
                <label>시공 공법</label>
                <select id="pile_method" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.88em; font-weight: normal;">
                    <option value="driven" ${initialMethod === 'driven' ? 'selected' : ''}>항타공법</option>
                    <option value="bored" ${initialMethod === 'bored' ? 'selected' : ''}>매입말뚝공법</option>
                </select>
            </div>

            <div class="input-group" style="margin:0;">
                <label>선단지지력 산정식</label>
                <select id="pile_qp_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em; font-weight: normal;"></select>
            </div>

            <div class="input-group" style="margin:0;">
                <label>주면마찰력 산정식</label>
                <select id="pile_qs_formula" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px; font-size: 0.82em; font-weight: normal;"></select>
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
        </div>

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

        <!-- 3. 지층 정보 -->
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
                            <th style="width: 14%; padding: 6px;">단위중량 γ<br>(kN/m³)</th>
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

        <button type="button" class="action-btn" id="calc-pile-btn" style="margin-top: 10px; cursor: pointer; width: 100%; padding: 12px; background: #2980b9; color: white; border: none; border-radius: 4px; font-weight: bold; font-size: 1em;">말뚝 연직지지력 산정 및 검토</button>
        <div id="pile-result" class="result-box" style="display: none; margin-top: 15px;"></div>
    `;

    function updateFormulaInfoText() {
        const type = container.querySelector('#pile_type').value;
        const method = container.querySelector('#pile_method').value;
        const qpVal = container.querySelector('#pile_qp_formula').value;
        const qsVal = container.querySelector('#pile_qs_formula').value;
        const infoBox = container.querySelector('#formula_info_box');

        if (!infoBox) return;

        let qpText = "";
        let qsText = "";

        if (type === 'CAST_ROCK') {
            if (qpVal === 'rock_case1') qpText = "q_p = 2.5·q_u (암반절리 미고려 / 신선암)";
            else qpText = "q_p = [√s + √(m√s + s)]·q_u (여러방향 절리, Hoek-Brown 1988 적용)";
            if (qsVal === 'oneill') qsText = "토사: O'Neill & Reese (1999) / 암반: Horvath & Kenney (1979)";
            else qsText = "토사: 건축기초 지침 (2004) / 암반: Horvath & Kenney (1979)";
        } else if (type === 'CAST') {
            if (qpVal === 'oneill') qpText = "57.4·N (N≤75) / 4,309.2 kN/m² (N>75) [O'Neill & Reese (1999)]";
            else qpText = "100·N_bar (사질토) / 6·c_u (점성토) [건축기초 구조설계지침 (2004)]";
            if (qsVal === 'oneill') qsText = "f_s = β·σ_v' (β = 1.5 - 0.245√Z, 상한 200 kPa) [O'Neill & Reese (1999)]";
            else qsText = "3.3·N (사질토, N≤50) / 1.0·c_u (점성토, c_u≤100 kPa) [건축기초 구조설계지침 (2004)]";
        } else if (method === 'driven') {
            qpText = "300·N (N≤60)";
            if (qsVal === 'lh') qsText = "2.0·N (사질토, N≤50), 5.0·q_u (점성토, q_u=2c_u, c_u≤125 kN/m²)";
            else qsText = "2.0·N (사질토, 상한 100 kN/m²), 1.0·c_u (점성토, 상한 100 kN/m²)";
        } else {
            if (qpVal === 'lh') qpText = "250·N (N≤60)";
            else qpText = "200·N (사질토, 상한 12,000 kN/m²), 6·c_u (점성토, 상한 12,000 kN/m²)";
            if (qsVal === 'lh') qsText = "2.0·N (사질토, N≤50), 5.0·q_u (점성토, q_u=2c_u, c_u≤125 kN/m²)";
            else qsText = "2.5·N (사질토, N≤50), 0.8·c_u (점성토, c_u≤125 kN/m²)";
        }

        infoBox.innerHTML = `
            <div style="font-weight: bold; color: #16a085; margin-bottom: 2px;">▶ 적용 산정식</div>
            <div style="margin-left: 6px; line-height: 1.5;">
                • <strong>선단지지력 :</strong> ${qpText}<br>
                • <strong>주면마찰력 :</strong> ${qsText}
            </div>
        `;
    }

    function updateMethodFormulas() {
        const type = container.querySelector('#pile_type').value;
        const method = container.querySelector('#pile_method').value;
        const qpSelect = container.querySelector('#pile_qp_formula');
        const qsSelect = container.querySelector('#pile_qs_formula');
        if (!qpSelect || !qsSelect) return;

        const savedQp = getVal('qp_formula', 'road');
        const savedQs = getVal('qs_formula', 'road');

        if (type === 'CAST_ROCK') {
            qpSelect.disabled = false;
            qpSelect.innerHTML = `
                <option value="rock_case1" ${savedQp === 'rock_case1' ? 'selected' : ''}>Case-1 (2.5 q_u)</option>
                <option value="rock_case2" ${savedQp === 'rock_case2' ? 'selected' : ''}>Case-2 (여러방향 절리)</option>
            `;
            qsSelect.disabled = false;
            qsSelect.innerHTML = `
                <option value="oneill" ${savedQs === 'oneill' ? 'selected' : ''}>O'Neill (토사) + H&K (암반)</option>
                <option value="aij" ${savedQs === 'aij' ? 'selected' : ''}>건축기초 (토사) + H&K (암반)</option>
            `;
        } else if (type === 'CAST') {
            qpSelect.disabled = false;
            qpSelect.innerHTML = `
                <option value="oneill" ${savedQp === 'oneill' ? 'selected' : ''}>O'Neill & Reese (1999)</option>
                <option value="aij" ${savedQp === 'aij' ? 'selected' : ''}>건축기초 구조설계지침 (2004)</option>
            `;
            qsSelect.disabled = false;
            qsSelect.innerHTML = `
                <option value="oneill" ${savedQs === 'oneill' ? 'selected' : ''}>O'Neill & Reese (1999)</option>
                <option value="aij" ${savedQs === 'aij' ? 'selected' : ''}>건축기초 구조설계지침 (2004)</option>
            `;
        } else if (method === 'driven') {
            qpSelect.innerHTML = `<option value="driven_standard" selected>항타공법 표준식 (300N)</option>`;
            qpSelect.disabled = true;
            qsSelect.disabled = false;
            qsSelect.innerHTML = `
                <option value="road" ${savedQs === 'road' ? 'selected' : ''}>도로교설계기준해설 (2008)</option>
                <option value="lh" ${savedQs === 'lh' ? 'selected' : ''}>주택공사 설계개선지침 (2008)</option>
            `;
        } else {
            qpSelect.disabled = false;
            qpSelect.innerHTML = `
                <option value="road" ${savedQp === 'road' ? 'selected' : ''}>도로교설계기준해설 (2008)</option>
                <option value="lh" ${savedQs === 'lh' ? 'selected' : ''}>주택공사 설계개선지침 (2008)</option>
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
        const type = container.querySelector('#pile_type').value;
        const grid2Label = container.querySelector('#grid2_label');
        const grid2Content = container.querySelector('#grid2_content');
        const grid5Label = container.querySelector('#grid5_label');
        const grid5Val = container.querySelector('#grid5_val');
        const specSelect = container.querySelector('#pile_spec_select');
        const pileMethod = container.querySelector('#pile_method');

        if (!specSelect || !grid2Content) return;
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
            Object.keys(PHC_DB).forEach(d => { specSelect.innerHTML += `<option value="${d}">D${d}</option>`; });
            specSelect.value = '500';
            pileMethod.disabled = false;
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
            Object.keys(STEEL_DB).forEach(d => { specSelect.innerHTML += `<option value="${d}">D${STEEL_DB[d].displayD}</option>`; });
            specSelect.value = '508.0';
            pileMethod.disabled = false;
        } else if (type === 'CAST' || type === 'CAST_ROCK') {
            if (type === 'CAST_ROCK') {
                grid2Label.innerHTML = '암의 유형 / RMR';
                grid2Content.innerHTML = `
                    <div style="display:flex; gap:3px; width:100%; height:100%;">
                        <select id="pile_rock_type" style="flex:1.8; min-width:0; text-align:left; padding-left:4px; box-sizing:border-box; border:1px solid #ccc; font-size:0.75em;" title="암의 유형 (Hoek & Brown, 1988)">
                            <option value="7">A : 벽개발달 탄산염암</option>
                            <option value="10">B : 석화 이질암</option>
                            <option value="15">C : 뚜렷한 벽개 사질암</option>
                            <option value="17" selected>D : 세립결정 화성암</option>
                            <option value="25">E : 조립결정 화성,변성암</option>
                        </select>
                        <input type="number" id="pile_rmr" value="${getVal('rmr', '30')}" step="1" placeholder="RMR" title="RMR 값 (0~100)" style="flex:1; min-width:0; text-align:center; box-sizing:border-box; padding:2px; border:1px solid #ccc; font-size:0.85em;">
                    </div>
                `;
            } else {
                grid2Label.textContent = '세부 구분';
                grid2Content.innerHTML = `<span style="color:#aaa; font-size:0.85em; width:100%; text-align:center;">- (없음) -</span>`;
            }
            grid5Label.textContent = '허용압축응력 σ_ca (MPa)';
            specSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            grid5Val.value = getVal('grid5_val', '35.0');
            pileMethod.value = 'bored';
            pileMethod.disabled = true;
        } else {
            grid2Label.textContent = '세부 구분';
            grid2Content.innerHTML = `<span style="color:#aaa; font-size:0.85em; width:100%; text-align:center;">- (없음) -</span>`;
            grid5Label.textContent = '허용압축응력 σ_ca (MPa)';
            specSelect.innerHTML = `<option value="direct">직접 입력</option>`;
            grid5Val.value = '80.0';
            pileMethod.disabled = false;
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

    // ---------------------------------------------------------
    // 이벤트 바인딩 (직접 바인딩 방식 결합)
    // ---------------------------------------------------------
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

    // 산정 버튼 직접 이벤트 연결 (동작 확실성 보장)
    const calcBtn = container.querySelector('#calc-pile-btn');
    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            calculatePileCapacity();
        });
    }

    container.addEventListener('change', (e) => {
        if (e.target.id === 'pile_type') {
            updateUIState();
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
                        <select data-idx="${idx}" class="pl-type" style="width:100%; box-sizing:border-box; padding:4px;">
                            <option value="sand" ${l.type === 'sand' ? 'selected' : ''}>사질토 / 풍화암</option>
                            <option value="clay" ${l.type === 'clay' ? 'selected' : ''}>점성토</option>
                            <option value="rock" ${l.type === 'rock' ? 'selected' : ''}>기반암 (연암/경암)</option>
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

    // Hoek & Brown (1988) 표 1 표준 데이터베이스
    const HB_TABLE_DATA = [
        { rmr: 3,   m: { 7: 0.007, 10: 0.010, 15: 0.015, 17: 0.017, 25: 0.025 }, s: 1.0e-7, label: "매우 불량한 암반 (3~23)" },
        { rmr: 23,  m: { 7: 0.029, 10: 0.041, 15: 0.061, 17: 0.069, 25: 0.102 }, s: 3.0e-6, label: "불량한 암반 (23~44)" },
        { rmr: 44,  m: { 7: 0.128, 10: 0.183, 15: 0.275, 17: 0.311, 25: 0.458 }, s: 9.0e-5, label: "보통의 암반 (44~65)" },
        { rmr: 65,  m: { 7: 0.575, 10: 0.821, 15: 1.231, 17: 1.395, 25: 2.052 }, s: 0.0029, label: "양호한 암반 (65~85)" },
        { rmr: 85,  m: { 7: 2.400, 10: 3.430, 15: 5.140, 17: 5.820, 25: 8.567 }, s: 0.082,  label: "매우 양호한 암반 (85~100)" },
        { rmr: 100, m: { 7: 7.000, 10: 10.000, 15: 15.000, 17: 17.000, 25: 25.000 }, s: 1.00,   label: "신선암 시료 (100)" }
    ];

    const ROCK_TYPE_NAME_MAP = {
        7: "A : 벽개발달 탄산염암",
        10: "B : 석화 이질암",
        15: "C : 뚜렷한 벽개 사질암",
        17: "D : 세립결정 화성암",
        25: "E : 조립결정 화성,변성암"
    };

    function interpolateHoekBrown(rmrVal, miVal) {
        if (rmrVal <= 3) {
            return { m: HB_TABLE_DATA[0].m[miVal], s: HB_TABLE_DATA[0].s, r1: 3, r2: 3 };
        }
        if (rmrVal >= 100) {
            return { m: HB_TABLE_DATA[5].m[miVal], s: HB_TABLE_DATA[5].s, r1: 100, r2: 100 };
        }
        for (let i = 0; i < HB_TABLE_DATA.length - 1; i++) {
            const row1 = HB_TABLE_DATA[i];
            const row2 = HB_TABLE_DATA[i + 1];
            if (rmrVal >= row1.rmr && rmrVal <= row2.rmr) {
                const t = (rmrVal - row1.rmr) / (row2.rmr - row1.rmr);
                const m1 = row1.m[miVal];
                const m2 = row2.m[miVal];
                return {
                    m: m1 + t * (m2 - m1),
                    s: row1.s + t * (row2.s - row1.s),
                    r1: row1.rmr,
                    r2: row2.rmr
                };
            }
        }
        return { m: HB_TABLE_DATA[2].m[miVal], s: HB_TABLE_DATA[2].s, r1: 44, r2: 44 };
    }

    // ---------------------------------------------------------
    // 연직지지력 산정 핵심 함수
    // ---------------------------------------------------------
    function calculatePileCapacity() {
        const p_type = container.querySelector('#pile_type').value;
        const method = container.querySelector('#pile_method').value;
        const qp_formula = container.querySelector('#pile_qp_formula').value;
        const qs_formula = container.querySelector('#pile_qs_formula').value;

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

        let pileLayersData = pileLayers;
        const L = pileLayersData.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

        const joint_type = container.querySelector('#pile_joint_type').value;
        const joint_cnt = parseInt(container.querySelector('#pile_joint_count').value) || 0;

        const P_norm = parseFloat(container.querySelector('#pile_P_norm').value);
        const P_seis = parseFloat(container.querySelector('#pile_P_seis').value);

        let lastLayer = pileLayersData.length > 0 ? pileLayersData[pileLayersData.length - 1] : { name: '지지층', type: 'sand', n_val: 50, gamma: 20.0, c_val: 0 };
        let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
        let c_tip = parseFloat(lastLayer.c_val) || 0;

        const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
        
        let q_p = 0; 
        let qp_formula_name = "";
        let qp_calc_detail = "";
        let hbRes = null, hb_m = 0, hb_s = 0, hb_mi = 17, input_rmr = 30;

        if (p_type === 'CAST_ROCK') {
            if (qp_formula === 'rock_case1') {
                qp_formula_name = "현장타설말뚝(기반암) - Case-1 (절리 미고려/신선암)";
                q_p = 2.5 * c_tip;
                qp_calc_detail = `2.5 &times; q<sub>u</sub> = 2.5 &times; ${c_tip} = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            } else {
                qp_formula_name = "현장타설말뚝(기반암) - Case-2 (여러방향 절리, Hoek & Brown 1988)";
                hb_mi = parseInt(container.querySelector('#pile_rock_type')?.value) || 17;
                input_rmr = parseFloat(container.querySelector('#pile_rmr')?.value) || 30;
                
                hbRes = interpolateHoekBrown(input_rmr, hb_mi);
                hb_m = hbRes.m;
                hb_s = hbRes.s;
                
                let factor = Math.sqrt(hb_s) + Math.sqrt(hb_m * Math.sqrt(hb_s) + hb_s);
                q_p = factor * c_tip;
                
                qp_calc_detail = `RMR = ${input_rmr}, m<sub>i</sub> = ${hb_mi} &rarr; m = ${hb_m.toFixed(4)}, s = ${hb_s.toExponential(3)}<br>` +
                                 `q<sub>p</sub> = [&radic;s + &radic;(m&radic;s + s)] &times; q<sub>u</sub> = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            }
        } else if (p_type === 'CAST') {
            if (qp_formula === 'oneill') {
                qp_formula_name = "현장타설말뚝 - O'Neill & Reese (1999)";
                q_p = raw_N_tip <= 75 ? 57.4 * raw_N_tip : 4309.2;
                qp_calc_detail = `q_p = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            } else {
                qp_formula_name = "현장타설말뚝 - 건축기초 구조설계지침 (2004)";
                q_p = (lastLayer.type === 'sand' || lastLayer.type === 'rock') ? 100.0 * raw_N_tip : 6.0 * c_tip;
                qp_calc_detail = `q_p = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            }
        } else if (method === 'driven') {
            qp_formula_name = "항타공법 산정식 (300·N)";
            q_p = 300.0 * Math.min(raw_N_tip, 60);
            qp_calc_detail = `q_p = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
        } else {
            if (qp_formula === 'lh') {
                qp_formula_name = "매입말뚝 - 주택공사 설계개선지침 (2008)";
                q_p = 250.0 * Math.min(raw_N_tip, 60);
            } else {
                qp_formula_name = "매입말뚝 - 도로교설계기준해설 (2008)";
                q_p = (lastLayer.type === 'sand' || lastLayer.type === 'rock') ? Math.min(200.0 * raw_N_tip, 12000.0) : Math.min(6.0 * c_tip, 12000.0);
            }
            qp_calc_detail = `q_p = <strong>${q_p.toFixed(1)} kN/m²</strong>`;
        }

        const Qup = q_p * Ap;

        const As = Math.PI * D;
        let total_Qus = 0;
        let layer_calc_rows = [];
        let qs_formula_name = (p_type.includes('CAST')) ? "현장타설 주면마찰력 산정식" : "일반말뚝 주면마찰력 산정식";

        let cum_depth = 0;
        let cum_sigma_v = 0; 

        pileLayersData.forEach(l => {
            let f_unit = 0;
            let dz_i = parseFloat(l.dz) || 0;
            let gamma_i = parseFloat(l.gamma) || 19.0;
            let c_val_i = parseFloat(l.c_val) || 0; 

            let z_mid = cum_depth + 0.5 * dz_i;
            let sigma_v_mid = cum_sigma_v + gamma_i * (0.5 * dz_i);
            let u_mid = Math.max(0, (z_mid - gwt) * 9.81);
            let sigma_v_prime = Math.max(0, sigma_v_mid - u_mid);

            if (l.type === 'rock' && p_type.includes('CAST')) {
                f_unit = Math.min(0.65 * 0.37 * 0.101 * Math.sqrt((c_val_i/1000.0)/0.101) * 1000.0, 7.8 * 0.101 * Math.sqrt(27.0/0.101) * 1000.0);
            } else if (p_type.includes('CAST')) {
                f_unit = Math.min(200.0, (1.5 - 0.245 * Math.sqrt(Math.max(0.1, z_mid))) * sigma_v_prime);
            } else {
                f_unit = (l.type === 'sand' || l.type === 'rock') ? Math.min(2.5 * l.n_val, 100.0) : Math.min(0.8 * c_val_i, 100.0);
            }

            let fxL = f_unit * dz_i;
            let Qus_i = fxL * As;
            total_Qus += Qus_i;

            layer_calc_rows.push({
                name: l.name,
                type: l.type === 'rock' ? '기반암' : (l.type === 'sand' ? '사질토' : '점성토'),
                dz: dz_i,
                n_val: l.n_val,
                gamma: gamma_i,
                c_val: c_val_i,
                z_mid: z_mid,
                sigma_v_prime: sigma_v_prime,
                f_unit: f_unit,
                fxL: fxL,
                qusi: Qus_i
            });

            cum_depth += dz_i;
            cum_sigma_v += gamma_i * dz_i;
        });

        const Qu_total = Qup + total_Qus;
        const Qa_soil_norm = Qu_total / 3.0;
        const Qa_soil_seis = Qu_total / 2.0;

        let A_net = (p_type.includes('CAST')) ? Ap : (Math.PI * (Math.pow(D - (t1_mm / 1000.0), 2) - Math.pow(Math.max(0, D - 2.0 * (t_mm / 1000.0)), 2))) / 4.0;
        let Q_mat_base = (p_type === 'PHC') ? grid5Val : (p_type === 'STEEL' ? grid5Val * A_net : grid5Val * 1000.0 * A_net);

        let n_limit = (p_type === 'PC') ? 80 : (p_type === 'RC' ? 70 : (p_type === 'STEEL' ? 100 : (p_type.includes('CAST') ? 60 : 85)));
        let mu1 = Math.max(0, (L / D) - n_limit);
        let mu2 = ((joint_type === 'weld') ? 5.0 : (joint_type === 'bolt' ? 10.0 : 0.0)) * (p_type.includes('CAST') ? 0.5 : 1.0) * joint_cnt;
        const Qas = (1.0 - Math.min(100, (mu1 + mu2)) / 100.0) * Q_mat_base;

        const Q_app_norm = Math.min(Qa_soil_norm, Qas);
        const Q_app_seis = Math.min(Qa_soil_seis, Qas);
        const ratio_norm = (P_norm / Q_app_norm) * 100;
        const ratio_seis = (P_seis / Q_app_seis) * 100;

        const status_norm = P_norm <= Q_app_norm ? `안정 (O.K) (${ratio_norm.toFixed(1)}%)` : `NG (${ratio_norm.toFixed(1)}%)`;
        const status_seis = P_seis <= Q_app_seis ? `안정 (O.K) (${ratio_seis.toFixed(1)}%)` : `NG (${ratio_seis.toFixed(1)}%)`;

        const resultDiv = container.querySelector('#pile-result');
        if (!resultDiv) return;
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
                            <td rowspan="2" style="vertical-align: middle; font-weight:bold; color:#8e44ad;">${Qas.toFixed(1)}</td>
                            <td style="font-weight:bold; color:#2980b9;">${Q_app_norm.toFixed(1)}</td>
                            <td>${P_norm.toFixed(1)}</td>
                            <td style="font-weight:bold; color:${P_norm <= Q_app_norm ? '#27ae60' : '#c0392b'};">${status_norm}</td>
                        </tr>
                        <tr>
                            <td><strong>내진시 (지진시)</strong></td>
                            <td>${Qa_soil_seis.toFixed(1)}</td>
                            <td style="font-weight:bold; color:#2980b9;">${Q_app_seis.toFixed(1)}</td>
                            <td>${P_seis.toFixed(1)}</td>
                            <td style="font-weight:bold; color:${P_seis <= Q_app_seis ? '#27ae60' : '#c0392b'};">${status_seis}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="section-title" style="margin-top:15px;">[검증 상세 내용]</div>
            <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
                • <strong>극한선단지지력 (Q<sub>up</sub>) :</strong> ${Qup.toFixed(1)} kN (${qp_formula_name})<br>
                • <strong>총 극한주면마찰력 (Q<sub>us</sub>) :</strong> ${total_Qus.toFixed(1)} kN<br>
                • <strong>지반 허용지지력 (평상시 / 내진시) :</strong> ${Qa_soil_norm.toFixed(1)} kN / ${Qa_soil_seis.toFixed(1)} kN<br>
                • <strong>재료 허용축하중 (Q<sub>as</sub>) :</strong> ${Qas.toFixed(1)} kN
            </div>
        `;
    }
}
