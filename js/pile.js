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
            { name: '지층1', type: 'sand', dz: 4.40, n_val: 40, gamma: 19.0, c_val: 25.0 },
            { name: '지층2', type: 'rock', dz: 5.60, n_val: 50, gamma: 20.0, c_val: 30000.0 }
        ];
        localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
    }

    const calcTotalL = () => pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

    const initialType = getVal('type', 'PHC');
    const initialT1 = parseFloat(getVal('t1', '1.0')).toFixed(1);
    const initialMethod = getVal('method', 'bored');
    const initialGWT = getVal('gwt', '2.0');

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

        <!-- Row 2: 시공 공법 | 선단지지력 식 | 주면마찰력 식 | 이음 방법 및 개소 (4개 그리드박스) -->
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

        <!-- 하단 실시간 산정식 안내 박스 -->
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

        <button class="action-btn" id="calc-pile-btn" style="margin-top: 10px;">말뚝 연직지지력 산정 및 검토</button>
        <div id="pile-result" class="result-box"></div>
    `;

    // ---------------------------------------------------------
    // UI 동적 제어 및 산정식 안내표시
    // ---------------------------------------------------------
    function updateFormulaInfoText() {
        const type = document.getElementById('pile_type').value;
        const method = document.getElementById('pile_method').value;
        const qpVal = document.getElementById('pile_qp_formula').value;
        const qsVal = document.getElementById('pile_qs_formula').value;
        const infoBox = document.getElementById('formula_info_box');

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
        const type = document.getElementById('pile_type').value;
        const method = document.getElementById('pile_method').value;
        const qpSelect = document.getElementById('pile_qp_formula');
        const qsSelect = document.getElementById('pile_qs_formula');

        const savedQp = getVal('qp_formula', 'road');
        const savedQs = getVal('qs_formula', 'road');

        if (type === 'CAST_ROCK') {
            qpSelect.disabled = false;
            qpSelect.innerHTML = `
                <option value="rock_case1" ${savedQp === 'rock_case1' ? 'selected' : ''}>암반 Case-1 (2.5 q_u)</option>
                <option value="rock_case2" ${savedQp === 'rock_case2' ? 'selected' : ''}>암반 Case-2 (여러방향 절리)</option>
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
        const tSelect = document.getElementById('pile_t_select');
        const tInput = document.getElementById('pile_t');
        const pileMethod = document.getElementById('pile_method');

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
        const type = document.getElementById('pile_type').value;
        const specVal = document.getElementById('pile_spec_select').value;
        const dInput = document.getElementById('pile_D');
        const tInput = document.getElementById('pile_t');
        const tSelect = document.getElementById('pile_t_select');
        const grid5Val = document.getElementById('grid5_val');

        tSelect.innerHTML = '';

        if (type === 'CAST' || type === 'CAST_ROCK') {
            tSelect.innerHTML = `<option value="none">- (없음) -</option>`;
            tSelect.disabled = true;
            tInput.value = '0';
            tInput.readOnly = true;
            tInput.style.backgroundColor = '#f2f2f2';
            dInput.readOnly = false;
            return;
        }

        tSelect.disabled = false;
        tInput.style.backgroundColor = '#fff';

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
                data.tList.forEach(t => { tSelect.innerHTML += `<option value="${t}">${t}mm</option>`; });
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
        const type = document.getElementById('pile_type').value;
        if (type === 'CAST' || type === 'CAST_ROCK') return;

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
        } else if (e.target.id === 'pile_gwt') {
            localStorage.setItem('geo_pile_gwt', e.target.value);
        } else if (e.target.id === 'pile_rmr') {
            localStorage.setItem('geo_pile_rmr', e.target.value);
        } else if (e.target.id === 'grid5_val') {
            localStorage.setItem('geo_pile_grid5_val', e.target.value);
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

    container.addEventListener('change', (e) => {
        if (e.target.classList.contains('pl-name')) pileLayers[e.target.dataset.idx].name = e.target.value;
        if (e.target.classList.contains('pl-type')) pileLayers[e.target.dataset.idx].type = e.target.value;
        if (e.target.classList.contains('pl-dz')) {
            pileLayers[e.target.dataset.idx].dz = parseFloat(e.target.value) || 0;
            updatePileLength();
        }
        if (e.target.classList.contains('pl-n')) pileLayers[e.target.dataset.idx].n_val = parseFloat(e.target.value) || 0;
        if (e.target.classList.contains('pl-gamma')) pileLayers[e.target.dataset.idx].gamma = parseFloat(e.target.value) || 19.0;
        if (e.target.classList.contains('pl-c')) pileLayers[e.target.dataset.idx].c_val = parseFloat(e.target.value) || 0;
        localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
    });

    container.addEventListener('click', (e) => {
        if (e.target.id === 'pile_layer_add') {
            const nextIdx = pileLayers.length + 1;
            pileLayers.push({ name: `지층${nextIdx}`, type: 'sand', dz: 3.0, n_val: 30, gamma: 19.0, c_val: 0 });
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

    const t_mm = (p_type === 'CAST' || p_type === 'CAST_ROCK') ? 0 : parseFloat(document.getElementById('pile_t').value);
    const grid5Val = parseFloat(document.getElementById('grid5_val').value) || 0;
    const gwt = parseFloat(document.getElementById('pile_gwt')?.value) || 2.0;

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

    // 1. 선단지지력 (Qup)
    let lastLayer = pileLayers.length > 0 ? pileLayers[pileLayers.length - 1] : { name: '지지층', type: 'sand', n_val: 50, gamma: 20.0, c_val: 0 };
    let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
    let c_tip = parseFloat(lastLayer.c_val) || 0;

    const Ap = (Math.PI * Math.pow(D, 2)) / 4.0;
    
    let q_p = 0; 
    let qp_formula_name = "";
    let qp_calc_detail = "";

    // Hoek-Brown 파라미터 변수 초기화
    let hb_m = 0, hb_s = 0, hb_mi = 0, input_rmr = 0; 

    if (p_type === 'CAST_ROCK') {
        if (qp_formula === 'rock_case1') {
            qp_formula_name = "현장타설말뚝(기반암) - Case-1 (절리 미고려/신선암)";
            q_p = 2.5 * c_tip;
            qp_calc_detail = `2.5 &times; q<sub>u</sub><br>&nbsp;&nbsp;= 2.5 &times; ${c_tip}<br>&nbsp;&nbsp;= <strong>${q_p.toFixed(1)} kN/m²</strong>`;
        } else {
            qp_formula_name = "현장타설말뚝(기반암) - Case-2 (여러방향 절리, Hoek & Brown 1988 적용)";
            hb_mi = parseFloat(document.getElementById('pile_rock_type')?.value) || 17;
            input_rmr = parseFloat(document.getElementById('pile_rmr')?.value) || 30;
            
            hb_s = Math.exp((input_rmr - 100) / 6.0); 
            hb_m = hb_mi * Math.exp((input_rmr - 100) / 14.0);
            
            let factor = Math.sqrt(hb_s) + Math.sqrt(hb_m * Math.sqrt(hb_s) + hb_s);
            q_p = factor * c_tip;
            
            qp_calc_detail = `[&radic;s + &radic;(m&radic;s + s)] &times; q<sub>u</sub><br>` +
                             `&nbsp;&nbsp;= [&radic;${hb_s.toFixed(5)} + &radic;(${hb_m.toFixed(3)}&times;&radic;${hb_s.toFixed(5)} + ${hb_s.toFixed(5)})] &times; ${c_tip}<br>` +
                             `&nbsp;&nbsp;= ${factor.toFixed(4)} &times; ${c_tip}<br>` +
                             `&nbsp;&nbsp;= <strong>${q_p.toFixed(1)} kN/m²</strong>`;
        }
    } else if (p_type === 'CAST') {
        if (qp_formula === 'oneill') {
            qp_formula_name = "현장타설말뚝 - O'Neill & Reese (1999)";
            if (raw_N_tip <= 75) {
                q_p = 57.4 * raw_N_tip;
                qp_calc_detail = `57.4 &times; N<br>&nbsp;&nbsp;= 57.4 &times; ${raw_N_tip}<br>&nbsp;&nbsp;= <strong>${q_p.toFixed(1)} kN/m²</strong> (미보정 N&le;75)`;
            } else {
                q_p = 4309.2;
                qp_calc_detail = `<strong>4,309.2 kN/m²</strong> (미보정 N>75 상한 적용)`;
            }
        } else {
            qp_formula_name = "현장타설말뚝 - 건축기초 구조설계지침 (2004)";
            if (lastLayer.type === 'sand' || lastLayer.type === 'rock') {
                q_p = 100.0 * raw_N_tip;
                qp_calc_detail = `100 &times; N<br>&nbsp;&nbsp;= 100 &times; ${raw_N_tip}<br>&nbsp;&nbsp;= <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            } else {
                q_p = 6.0 * c_tip;
                qp_calc_detail = `6 &times; c<sub>u</sub><br>&nbsp;&nbsp;= 6 &times; ${c_tip}<br>&nbsp;&nbsp;= <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            }
        }
    } else if (method === 'driven') {
        qp_formula_name = "항타공법 산정식 (300·N)";
        let N_used = Math.min(raw_N_tip, 60);
        q_p = 300.0 * N_used;
        qp_calc_detail = `300 &times; N<br>&nbsp;&nbsp;= 300 &times; ${N_used}<br>&nbsp;&nbsp;= <strong>${q_p.toFixed(1)} kN/m²</strong>`;
    } else {
        if (qp_formula === 'lh') {
            qp_formula_name = "매입말뚝 - 주택공사 설계개선지침 (2008)";
            let N_used = Math.min(raw_N_tip, 60);
            q_p = 250.0 * N_used;
            qp_calc_detail = `250 &times; N<br>&nbsp;&nbsp;= 250 &times; ${N_used}<br>&nbsp;&nbsp;= <strong>${q_p.toFixed(1)} kN/m²</strong>`;
        } else {
            qp_formula_name = "매입말뚝 - 도로교설계기준해설 (2008)";
            if (lastLayer.type === 'sand' || lastLayer.type === 'rock') {
                q_p = Math.min(200.0 * raw_N_tip, 12000.0);
                qp_calc_detail = `min(200 &times; N, 12,000)<br>&nbsp;&nbsp;= min(200 &times; ${raw_N_tip}, 12,000)<br>&nbsp;&nbsp;= <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            } else {
                q_p = Math.min(6.0 * c_tip, 12000.0);
                qp_calc_detail = `min(6 &times; c<sub>u</sub>, 12,000)<br>&nbsp;&nbsp;= min(6 &times; ${c_tip}, 12,000)<br>&nbsp;&nbsp;= <strong>${q_p.toFixed(1)} kN/m²</strong>`;
            }
        }
    }

    const Qup = q_p * Ap;

    // 2. 주면마찰력 (Qus) 및 지반 유효연직응력(σ_v') 계산
    const As = Math.PI * D;
    let total_Qus = 0;
    let layer_calc_rows = [];
    let qs_formula_name = "";

    if (p_type === 'CAST_ROCK' || p_type === 'CAST') {
        qs_formula_name = qs_formula === 'oneill' ? "현장타설 - O'Neill(토사) & H&K(암반)" : "현장타설 - 건축기초(토사) & H&K(암반)";
    } else if (qs_formula === 'lh') {
        qs_formula_name = (method === 'driven' ? "항타공법 - " : "매입말뚝 - ") + "주택공사 설계개선지침 (2008)";
    } else {
        qs_formula_name = (method === 'driven' ? "항타공법 - " : "매입말뚝 - ") + "도로교설계기준해설 (2008)";
    }

    let cum_depth = 0;
    let cum_sigma_v = 0; 
    let default_fck = 27.0;  
    let default_alpha_e = 0.37;

    pileLayers.forEach(l => {
        let f_unit = 0;
        let formula_str = "";
        let dz_i = parseFloat(l.dz) || 0;
        let gamma_i = parseFloat(l.gamma) || 19.0;
        let c_val_i = parseFloat(l.c_val) || 0; 

        let z_mid = cum_depth + 0.5 * dz_i;
        let sigma_v_mid = cum_sigma_v + gamma_i * (0.5 * dz_i);
        let u_mid = Math.max(0, (z_mid - gwt) * 9.81);
        let sigma_v_prime = Math.max(0, sigma_v_mid - u_mid);

        if (l.type === 'rock' && (p_type === 'CAST_ROCK' || p_type === 'CAST')) {
            let P_a = 0.101; 
            let qu_MPa = c_val_i / 1000.0; 
            
            let fs_MPa = 0.65 * default_alpha_e * P_a * Math.pow(qu_MPa / P_a, 0.5); 
            let fs_limit_MPa = 7.8 * P_a * Math.pow(default_fck / P_a, 0.5); 
            let f_unit_MPa = Math.min(fs_MPa, fs_limit_MPa);
            f_unit = f_unit_MPa * 1000.0; 
            
            formula_str = `0.65&alpha;<sub>E</sub>P<sub>a</sub>(q<sub>u</sub>/P<sub>a</sub>)<sup>0.5</sup><br>` +
                          `= 0.65(0.37)(${P_a})(${qu_MPa}/${P_a})<sup>0.5</sup><br>` + 
                          `= ${f_unit.toFixed(1)}`;
        } else if (p_type === 'CAST' || p_type === 'CAST_ROCK') {
            if (qs_formula === 'oneill') {
                let beta = 1.5 - 0.245 * Math.sqrt(Math.max(0.1, z_mid));
                beta = Math.max(0.25, Math.min(1.20, beta));
                f_unit = Math.min(200.0, beta * sigma_v_prime);
                formula_str = `&beta; &times; &sigma;<sub>v</sub>'<br>= ${beta.toFixed(2)} &times; ${sigma_v_prime.toFixed(1)}<br>= ${f_unit.toFixed(1)}`;
            } else {
                if (l.type === 'sand') {
                    let N_lim = Math.min(l.n_val, 50.0);
                    f_unit = 3.3 * N_lim;
                    formula_str = `3.3 &times; N<br>= 3.3 &times; ${N_lim}<br>= ${f_unit.toFixed(1)}`;
                } else {
                    let c_lim = Math.min(c_val_i, 100.0);
                    f_unit = 1.0 * c_lim;
                    formula_str = `1.0 &times; c<sub>u</sub><br>= 1.0 &times; ${c_lim}<br>= ${f_unit.toFixed(1)}`;
                }
            }
        } else if (method === 'driven') {
            if (qs_formula === 'lh') {
                if (l.type === 'sand' || l.type === 'rock') {
                    let N_lim = Math.min(l.n_val, 50.0);
                    f_unit = 2.0 * N_lim;
                    formula_str = `2.0 &times; N<br>= 2.0 &times; ${N_lim}<br>= ${f_unit.toFixed(1)}`;
                } else {
                    let c_lim = Math.min(c_val_i, 125.0);
                    let q_u = 2.0 * c_lim;
                    f_unit = 5.0 * q_u;
                    formula_str = `5.0 &times; q<sub>u</sub><br>= 5.0 &times; ${q_u.toFixed(1)}<br>= ${f_unit.toFixed(1)}`;
                }
            } else {
                if (l.type === 'sand' || l.type === 'rock') {
                    f_unit = Math.min(2.0 * l.n_val, 100.0);
                    formula_str = `min(2.0 &times; N, 100)<br>= min(2.0 &times; ${l.n_val}, 100)<br>= ${f_unit.toFixed(1)}`;
                } else {
                    f_unit = Math.min(1.0 * c_val_i, 100.0);
                    formula_str = `min(1.0 &times; c<sub>u</sub>, 100)<br>= min(1.0 &times; ${c_val_i}, 100)<br>= ${f_unit.toFixed(1)}`;
                }
            }
        } else {
            if (qs_formula === 'lh') {
                if (l.type === 'sand' || l.type === 'rock') {
                    let N_lim = Math.min(l.n_val, 50.0);
                    f_unit = 2.0 * N_lim;
                    formula_str = `2.0 &times; N<br>= 2.0 &times; ${N_lim}<br>= ${f_unit.toFixed(1)}`;
                } else {
                    let c_lim = Math.min(c_val_i, 125.0);
                    let q_u = 2.0 * c_lim;
                    f_unit = 5.0 * q_u;
                    formula_str = `5.0 &times; q<sub>u</sub><br>= 5.0 &times; ${q_u.toFixed(1)}<br>= ${f_unit.toFixed(1)}`;
                }
            } else {
                if (l.type === 'sand' || l.type === 'rock') {
                    let N_lim = Math.min(l.n_val, 50.0);
                    f_unit = 2.5 * N_lim;
                    formula_str = `2.5 &times; N<br>= 2.5 &times; ${N_lim}<br>= ${f_unit.toFixed(1)}`;
                } else {
                    let c_lim = Math.min(c_val_i, 125.0);
                    f_unit = 0.8 * c_lim;
                    formula_str = `0.8 &times; c<sub>u</sub><br>= 0.8 &times; ${c_lim}<br>= ${f_unit.toFixed(1)}`;
                }
            }
        }

        let fxL = f_unit * dz_i;
        let Qus_i = fxL * As;
        total_Qus += Qus_i;

        let display_type = l.type === 'rock' ? '기반암' : (l.type === 'sand' ? '사질토' : '점성토');

        layer_calc_rows.push({
            name: l.name,
            type: display_type,
            dz: dz_i,
            n_val: l.n_val,
            gamma: gamma_i,
            c_val: c_val_i,
            z_mid: z_mid,
            sigma_v_prime: sigma_v_prime,
            formula: formula_str,
            f_unit: f_unit,
            fxL: fxL,
            qusi: Qus_i
        });

        cum_depth += dz_i;
        cum_sigma_v += gamma_i * dz_i;
    });

    // 3. 지반 허용지지력 (Qa_soil) 
    const Qu_total = Qup + total_Qus;
    const Qa_soil_norm = Qu_total / 3.0;
    const Qa_soil_seis = Qu_total / 2.0;

    // 4. 재료 허용압축하중 (Qas)
    let A_net = 0;
    if (p_type === 'CAST' || p_type === 'CAST_ROCK') {
        A_net = Ap; 
    } else {
        const D_out = D - (t1_mm / 1000.0);
        const D_in = Math.max(0, D - 2.0 * (t_mm / 1000.0));
        A_net = (Math.PI * (Math.pow(D_out, 2) - Math.pow(D_in, 2))) / 4.0;
    }

    let Q_mat_base = 0;
    let qMatBaseDetailStr = "";

    if (p_type === 'PHC') {
        Q_mat_base = grid5Val;
        qMatBaseDetailStr = `• 기본 허용압축하중 Q<sub>mat_base</sub> = <strong>${Q_mat_base.toFixed(1)} kN</strong>`;
    } else if (p_type === 'STEEL') {
        Q_mat_base = grid5Val * A_net;
        qMatBaseDetailStr = `• 기본 허용압축하중 Q<sub>mat_base</sub> = &sigma;<sub>ca</sub> &times; A<sub>net</sub> = ${grid5Val.toLocaleString()} &times; ${A_net.toFixed(5)} = <strong>${Q_mat_base.toFixed(1)} kN</strong>`;
    } else {
        Q_mat_base = grid5Val * 1000.0 * A_net;
        qMatBaseDetailStr = `• 기본 허용압축하중 Q<sub>mat_base</sub> = &sigma;<sub>ca</sub> &times; A<sub>net</sub> &times; 1000 = ${grid5Val.toFixed(1)} &times; ${A_net.toFixed(5)} &times; 1000 = <strong>${Q_mat_base.toFixed(1)} kN</strong>`;
    }

    const L_over_D = L / D;
    let n_limit = 85; 
    if (p_type === 'PC') n_limit = 80;
    else if (p_type === 'RC') n_limit = 70;
    else if (p_type === 'STEEL') n_limit = 100;
    else if (p_type === 'CAST' || p_type === 'CAST_ROCK') n_limit = 60;

    let mu1 = Math.max(0, L_over_D - n_limit);
    let mu2_base = (joint_type === 'weld') ? 5.0 : (joint_type === 'bolt' ? 10.0 : 0.0);
    let mu2 = (method === 'bored' || p_type === 'CAST' || p_type === 'CAST_ROCK') ? (mu2_base * 0.5 * joint_cnt) : (mu2_base * joint_cnt);

    const Qas = (1.0 - (mu1 + mu2) / 100.0) * Q_mat_base;

    // 5. 안전성 검토 및 비율 (작용력/허용력)%
    const Q_app_norm = Math.min(Qa_soil_norm, Qas);
    const Q_app_seis = Math.min(Qa_soil_seis, Qas);

    const ratio_norm = (P_norm / Q_app_norm) * 100;
    const ratio_seis = (P_seis / Q_app_seis) * 100;

    const status_norm = P_norm <= Q_app_norm ? `안정 (O.K) (${ratio_norm.toFixed(1)}%)` : `NG (${ratio_norm.toFixed(1)}%)`;
    const status_seis = P_seis <= Q_app_seis ? `안정 (O.K) (${ratio_seis.toFixed(1)}%)` : `NG (${ratio_seis.toFixed(1)}%)`;

    // 추가 테이블 블록 렌더링 (Case-2 인 경우)
    let extraTableHtml = "";
    if (p_type === 'CAST_ROCK' && qp_formula === 'rock_case2') {
        extraTableHtml = `
            <div style="font-weight: bold; margin-bottom: 6px; margin-top:20px; color: #2c3e50; font-size: 0.85em;">■ 표 1. 비선형 강도 정의상 암질과 재료상수의 대략적인 관계 (Hoek & Brown, 1988)</div>
            <div class="table-container" style="margin-bottom: 15px;">
                <table class="result-table" style="font-size: 0.75em; text-align: center;">
                    <thead>
                        <tr style="background-color: #eaeded;">
                            <th rowspan="2">암 질</th><th rowspan="2">정수</th>
                            <th colspan="5">암의 유형 (m<sub>i</sub> 기준)</th>
                        </tr>
                        <tr style="background-color: #f2f4f4;">
                            <th>A: 벽개발달 탄산염암 (7.00)</th><th>B: 석화 이질암 (10.00)</th><th>C: 뚜렷한 벽개 사질암 (15.00)</th><th>D: 세립결정 화성암 (17.00)</th><th>E: 조립결정 화성,변성암 (25.00)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>신선암 시료 (RMR=100)</td><td>m<br>s</td><td>7.00<br>1.00</td><td>10.00<br>1.00</td><td>15.00<br>1.00</td><td style="${hb_mi==17?'background:#fffbcc;font-weight:bold;':''}">17.00<br>1.00</td><td>25.00<br>1.00</td></tr>
                        <tr><td>매우 양호한 암반 (RMR=85)</td><td>m<br>s</td><td>2.400<br>0.082</td><td>3.430<br>0.082</td><td>5.140<br>0.082</td><td style="${hb_mi==17?'background:#fffbcc;font-weight:bold;':''}">5.820<br>0.082</td><td>8.567<br>0.082</td></tr>
                        <tr><td>양호한 암반 (RMR=65)</td><td>m<br>s</td><td>0.575<br>0.0029</td><td>0.821<br>0.0029</td><td>1.231<br>0.0029</td><td style="${hb_mi==17?'background:#fffbcc;font-weight:bold;':''}">1.395<br>0.0029</td><td>2.052<br>0.0029</td></tr>
                        <tr><td>보통의 암반 (RMR=44)</td><td>m<br>s</td><td>0.128<br>9.0E-05</td><td>0.183<br>9.0E-05</td><td>0.275<br>9.0E-05</td><td style="${hb_mi==17?'background:#fffbcc;font-weight:bold;':''}">0.311<br>9.0E-05</td><td>0.458<br>9.0E-05</td></tr>
                        <tr><td>불량한 암반 (RMR=23)</td><td>m<br>s</td><td>0.029<br>3.0E-06</td><td>0.041<br>3.0E-06</td><td>0.061<br>3.0E-06</td><td style="${hb_mi==17?'background:#fffbcc;font-weight:bold;':''}">0.069<br>3.0E-06</td><td>0.102<br>3.0E-06</td></tr>
                        <tr><td>매우 불량한 암반 (RMR=3)</td><td>m<br>s</td><td>0.007<br>1.0E-07</td><td>0.010<br>1.0E-07</td><td>0.015<br>1.0E-07</td><td style="${hb_mi==17?'background:#fffbcc;font-weight:bold;':''}">0.017<br>1.0E-07</td><td>0.025<br>1.0E-07</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div style="font-weight: bold; margin-bottom: 6px; color: #2c3e50; font-size: 0.85em;">■ 표 2. RMR을 이용한 암반의 분류 (Hoek & Brown, 1988)</div>
            <div class="table-container" style="margin-bottom: 15px;">
                <table class="result-table" style="font-size: 0.8em; text-align: center;">
                    <thead><tr style="background-color: #eaeded;"><th>Rock Quality</th><th>RMR Range</th><th>적용 여부</th></tr></thead>
                    <tbody>
                        <tr style="${input_rmr>=85 ? 'background:#e8f8f5;font-weight:bold;color:#16a085;':''}"><td>신선암 시료</td><td>85 ~ 100</td><td>${input_rmr>=85 ? 'O' : ''}</td></tr>
                        <tr style="${input_rmr>=65 && input_rmr<85 ? 'background:#e8f8f5;font-weight:bold;color:#16a085;':''}"><td>매우 양호한 암반</td><td>65 ~ 85</td><td>${input_rmr>=65 && input_rmr<85 ? 'O' : ''}</td></tr>
                        <tr style="${input_rmr>=44 && input_rmr<65 ? 'background:#e8f8f5;font-weight:bold;color:#16a085;':''}"><td>양호한 암반</td><td>44 ~ 65</td><td>${input_rmr>=44 && input_rmr<65 ? 'O' : ''}</td></tr>
                        <tr style="${input_rmr>=23 && input_rmr<44 ? 'background:#e8f8f5;font-weight:bold;color:#16a085;':''}"><td>보통의 암반</td><td>23 ~ 44</td><td>${input_rmr>=23 && input_rmr<44 ? 'O' : ''}</td></tr>
                        <tr style="${input_rmr>=3 && input_rmr<23 ? 'background:#e8f8f5;font-weight:bold;color:#16a085;':''}"><td>불량한 암반</td><td>3 ~ 23</td><td>${input_rmr>=3 && input_rmr<23 ? 'O' : ''}</td></tr>
                        <tr style="${input_rmr<3 ? 'background:#e8f8f5;font-weight:bold;color:#16a085;':''}"><td>매우 불량한 암반</td><td>0 ~ 3</td><td>${input_rmr<3 ? 'O' : ''}</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    }

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
                        <th>검토 결과 (작용/허용 %)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>평상시 (상시)</strong></td>
                        <td>${Qa_soil_norm.toFixed(1)}</td>
                        <td rowspan="2" style="vertical-align: middle; font-weight:bold; color:#8e44ad;">${Qas.toFixed(1)}<br><span style="font-size:0.8em; font-weight:normal; color:#7f8c8d;">(단일값 적용)</span></td>
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

        <div class="section-title">[검증 1] 지반에 의한 연직 허용지지력 산정</div>
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
            <strong>(1) 말뚝 선단지지력 (Q<sub>up</sub>)</strong><br>
            • 적용 산정식 : <strong>${qp_formula_name}</strong><br>
            • 최하단 지층 : <strong>${lastLayer.name}</strong> (N = ${raw_N_tip}, ${lastLayer.type === 'rock' ? 'q<sub>u</sub>' : 'c'} = ${c_tip} kPa)<br>
            • 단위면적당 극한선단지지력 q<sub>p</sub> = <br>
            <div style="margin-left: 20px; font-family: monospace; background: #fdf2e9; padding: 6px; display: inline-block; border-radius: 4px;">${qp_calc_detail}</div><br>
            • 선단면적 A<sub>p</sub> = &pi; &times; D² / 4 = &pi; &times; ${D.toFixed(3)}² / 4 = <strong>${Ap.toFixed(5)} m²</strong> (D = ${D_mm.toFixed(1)}mm)<br>
            • <strong>극한선단지지력 Q<sub>up</sub></strong> = q<sub>p</sub> &times; A<sub>p</sub> = ${q_p.toFixed(1)} &times; ${Ap.toFixed(5)} = <span style="font-weight:bold; color:#8e44ad;">${Qup.toFixed(1)} kN</span><br><br>

            <strong>(2) 말뚝 주면마찰력 (Q<sub>us</sub>)</strong><br>
            • 적용 산정식 : <strong>${qs_formula_name}</strong><br>
            • 지하수위 GWT : <strong>GL. -${gwt.toFixed(1)} m</strong><br>
            • 말뚝 둘레 A<sub>s</sub> = &pi; &times; D = &pi; &times; ${D.toFixed(3)} = <strong>${As.toFixed(3)} m</strong><br>
            • <strong>총 극한주면마찰력 Q<sub>us</sub></strong> = &sum; (f<sub>s</sub> &times; L) &times; A<sub>s</sub> = <strong>${total_Qus.toFixed(1)} kN</strong>
        </div>

        <div class="table-container" style="margin-bottom: 15px;">
            <table class="result-table" style="font-size: 0.8em; text-align: center;">
                <thead>
                    <tr style="background-color: #eaeded;">
                        <th>지층명</th>
                        <th>토성구분</th>
                        <th>층후 L<br>(m)</th>
                        <th>N치 / &gamma; / c(q<sub>u</sub>)</th>
                        <th>중앙깊이 Z /<br>유효응력 &sigma;<sub>v</sub>'</th>
                        <th style="min-width: 150px;">단위 마찰력 f<sub>s</sub> (kN/m²)</th>
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
                            <td>${r.n_val} / ${r.gamma.toFixed(1)} / ${r.c_val}</td>
                            <td>${r.z_mid.toFixed(2)}m /<br>${r.sigma_v_prime.toFixed(1)}kPa</td>
                            <td style="text-align: left; padding: 4px 8px; font-family: monospace;">${r.formula}</td>
                            <td>${r.fxL.toFixed(1)}</td>
                            <td style="font-weight:bold; color:#2980b9;">${r.qusi.toFixed(1)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f5eef8; font-weight: bold;">
                        <td colspan="7">주면마찰력 합계 (&sum;)</td>
                        <td style="color:#27ae60; font-size:1.1em;">${total_Qus.toFixed(1)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px;">
            <strong>(3) 지반 허용지지력 (Q<sub>a,soil</sub>)</strong><br>
            • 평상시 (F.S = 3.0) : (Q<sub>up</sub> + Q<sub>us</sub>) / 3.0 = (${Qup.toFixed(1)} + ${total_Qus.toFixed(1)}) / 3.0 = <strong>${Qa_soil_norm.toFixed(1)} kN</strong><br>
            • 내진시 (F.S = 2.0) : (Q<sub>up</sub> + Q<sub>us</sub>) / 2.0 = (${Qup.toFixed(1)} + ${total_Qus.toFixed(1)}) / 2.0 = <strong>${Qa_soil_seis.toFixed(1)} kN</strong>
        </div>

        <div class="section-title">[검증 2] 말뚝 재료에 의한 허용압축하중 산정</div>
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px;">
            ${(p_type === 'CAST' || p_type === 'CAST_ROCK') ? `• 현장타설말뚝 실단면적 A<sub>net</sub> = &pi; &times; D² / 4 = &pi; &times; ${D.toFixed(3)}² / 4 = <strong>${A_net.toFixed(5)} m²</strong> (직경 D = ${D_mm.toFixed(1)}mm)<br>` : `• 말뚝 외경 D<sub>out</sub> : D - 부식t<sub>1</sub> = ${D.toFixed(4)}m ${p_type === 'STEEL' ? '- ' + (t1_mm/1000.0).toFixed(4) + 'm = ' + D_out.toFixed(4) + 'm' : '= ' + D_out.toFixed(4)}m<br>• 말뚝 내경 D<sub>in</sub> : D - 2 &times; t = ${D.toFixed(4)}m - 2 &times; ${(t_mm/1000.0).toFixed(4)}m = <strong>${D_in.toFixed(4)} m</strong><br>• 유효 단면적 A<sub>net</sub> = &pi; &times; (D<sub>out</sub>² - D<sub>in</sub>²) / 4 = &pi; &times; (${D_out.toFixed(4)}² - ${D_in.toFixed(4)}²) / 4 = <strong>${A_net.toFixed(5)} m²</strong><br>`}
            ${qMatBaseDetailStr}<br><br>
            • 산정 공식 : Q<sub>as</sub> = [1 - (&mu;<sub>1</sub> + &mu;<sub>2</sub>)/100] &times; Q<sub>mat_base</sub><br>
            • 장경비 L/D = ${L.toFixed(2)} / ${D.toFixed(3)} = ${L_over_D.toFixed(2)} (한계치 n = ${n_limit}) &rarr; 장경비 저감율 &mu;<sub>1</sub> = <strong>${mu1.toFixed(1)} %</strong><br>
            • 이음 저감율 &mu;<sub>2</sub> = <strong>${mu2.toFixed(1)} %</strong> (${joint_type === 'none' ? '이음없음' : joint_type + ' ' + joint_cnt + '개소'})<br>
            • <strong>최종 재료 허용압축하중 Q<sub>as</sub></strong> = [1 - ${(mu1 + mu2).toFixed(1)}/100] &times; ${Q_mat_base.toFixed(1)} = <span style="color:#8e44ad; font-weight:bold;">${Qas.toFixed(1)} kN</span>
        </div>

        ${extraTableHtml}
    `;
}
