document.addEventListener('DOMContentLoaded', function() {
  // Pro lepší responzivitu na mobilech nastavíme výšku viewport
  function setMobileHeight() {
    // Nastavení výšky na viditelnou oblast prohlížeče - opraveno
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Úprava stylu pro mobilní zobrazení
    const mapContainer = document.querySelector('.map-container');
    const sidebar = document.getElementById('planForm');
    
    if (window.innerWidth < 992) {
      // Mobilní zobrazení - full výška pro mapu
      mapContainer.style.height = `calc(var(--vh, 1vh) * 100 - 3.5rem)`;
      sidebar.style.height = `calc(var(--vh, 1vh) * 100 - 3.5rem)`;
    } else {
      // Desktop zobrazení - reset výšky
      mapContainer.style.height = '';
      sidebar.style.height = '';
    }
  }
  
  // Volání funkce při načtení a při změně velikosti
  window.addEventListener('resize', setMobileHeight);
  window.addEventListener('orientationchange', setMobileHeight);
  setMobileHeight();
  
  // Elementi pro přepínání zobrazení formuláře/mapy
  const toggleFormBtn = document.getElementById('toggleFormBtn');
  const closeFormBtn = document.getElementById('closeFormBtn');
  const floatingPlanBtn = document.getElementById('floatingPlanBtn');
  const sidebar = document.getElementById('planForm');
  const overlay = document.getElementById('overlay');

  // Responzivní přepínání mezi formulářem a mapou na mobilní verzi
  function toggleSidebar() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
  }

  toggleFormBtn.addEventListener('click', toggleSidebar);
  closeFormBtn.addEventListener('click', toggleSidebar);
  floatingPlanBtn.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', toggleSidebar);

  // Kontrola šířky okna a automatické zobrazení/skrytí sidebaru
  function checkWindowSize() {
    if (window.innerWidth >= 992) {
      // Na desktopu: vždy zobrazit sidebar, skrýt overlay a plovoucí tlačítko
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.classList.remove('sidebar-open');
      floatingPlanBtn.style.display = 'none';
      toggleFormBtn.style.display = 'none';
    } else {
      // Na mobilních zařízeních: skrýt sidebar, zobrazit plovoucí tlačítko
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      floatingPlanBtn.style.display = 'flex';
      toggleFormBtn.style.display = 'flex';
    }
  }

  // Kontrola při načtení a při změně velikosti okna
  window.addEventListener('resize', checkWindowSize);
  checkWindowSize();

  // Debounce funkce
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

// === VALIDAČNÍ FUNKCE ===

  // Validace formátu času (HH:MM)
  function isValidTimeFormat(timeString) {
    if (!timeString) return false;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  }

  // Převod času (HH:MM) na minuty od půlnoci
  function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Porovnání dvou časů (vrací true pokud time1 je před time2)
  function isTimeBefore(time1, time2) {
    return timeToMinutes(time1) < timeToMinutes(time2);
  }

  // Validace, zda fixovaný čas není dřív než čas odjezdu
  function validateFixedTimeAfterDeparture(fixedTime, departureTime) {
    if (!isValidTimeFormat(fixedTime) || !isValidTimeFormat(departureTime)) {
      return { valid: false, message: 'Neplatný formát času.' };
    }
    
    if (!isTimeBefore(departureTime, fixedTime) && timeToMinutes(fixedTime) !== timeToMinutes(departureTime)) {
      return { 
        valid: false, 
        message: `Fixovaný čas (${fixedTime}) musí být po času odjezdu (${departureTime}).` 
      };
    }
    
    return { valid: true };
  }

  // Validace posloupnosti fixovaných časů mezi zastávkami
  function validateFixedTimesSequence(stops, departureTime) {
    let lastTime = departureTime;
    
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      
      if (stop.fixed && stop.fixedTime) {
        if (!isValidTimeFormat(stop.fixedTime)) {
          return { 
            valid: false, 
            message: `Neplatný formát času u zastávky ${i + 1}.` 
          };
        }
        
        // Kontrola, zda je fixovaný čas po předchozím času
        if (!isTimeBefore(lastTime, stop.fixedTime) && timeToMinutes(lastTime) !== timeToMinutes(stop.fixedTime)) {
          return { 
            valid: false, 
            message: `Fixovaný čas zastávky ${i + 1} (${stop.fixedTime}) musí být po předchozím času (${lastTime}).` 
          };
        }
        
        lastTime = stop.fixedTime;
      }
    }
    
    return { valid: true };
  }

  // Validace všech vstupů
  function validateInputs(startAddr, endAddr, departureTime, stops) {
    // Kontrola základních polí
    if (!startAddr || startAddr.trim() === '') {
      return { valid: false, message: 'Zadejte prosím adresu startu.' };
    }
    
    if (!endAddr || endAddr.trim() === '') {
      return { valid: false, message: 'Zadejte prosím adresu cíle.' };
    }
    
    if (!departureTime || departureTime.trim() === '') {
      return { valid: false, message: 'Zadejte prosím čas odjezdu.' };
    }
    
    if (!isValidTimeFormat(departureTime)) {
      return { valid: false, message: 'Neplatný formát času odjezdu.' };
    }
    
    // Kontrola zastávek
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      
      if (!stop.addr || stop.addr.trim() === '') {
        return { valid: false, message: `Zadejte prosím adresu zastávky ${i + 1}.` };
      }
      
      if (stop.break < 0) {
        return { valid: false, message: `Doba přestávky u zastávky ${i + 1} nemůže být záporná.` };
      }
      
      // Validace fixovaného času
      if (stop.fixed && stop.fixedTime) {
        const fixedValidation = validateFixedTimeAfterDeparture(stop.fixedTime, departureTime);
        if (!fixedValidation.valid) {
          return { 
            valid: false, 
            message: `Zastávka ${i + 1}: ${fixedValidation.message}` 
          };
        }
      }
    }
    
    // Validace posloupnosti fixovaných časů
    const sequenceValidation = validateFixedTimesSequence(stops, departureTime);
    if (!sequenceValidation.valid) {
      return sequenceValidation;
    }
    
    return { valid: true };
  }

  // Funkce pro zobrazení chybové zprávy
  function showError(message) {
    const errorNotification = document.createElement('div');
    errorNotification.className = 'notification error-notification';
    errorNotification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.body.appendChild(errorNotification);
    
    setTimeout(() => {
      errorNotification.classList.add('hide');
      setTimeout(() => errorNotification.remove(), 300);
    }, 5000);
  }

  // Funkce pro zobrazení úspěšné zprávy
  function showSuccess(message) {
    const successNotification = document.createElement('div');
    successNotification.className = 'notification success-notification';
    successNotification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(successNotification);
    
    setTimeout(() => {
      successNotification.classList.add('hide');
      setTimeout(() => successNotification.remove(), 300);
    }, 3000);
  }
  
// Optimalizovaná funkce pro vyhledávání s error handlingem
  async function fetchSuggestions(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&namedetails=1&limit=10&countrycodes=cz&q=${encodeURIComponent(query)}`;
    
    try {
      // Kontrola online stavu
      if (!isOnline()) {
        console.warn('Offline - nelze načíst návrhy');
        return [];
      }
      
      const response = await fetchWithRetry(url, {}, 1); // Max 1 retry pro autocomplete
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Chyba při načítání návrhů:', err);
      // Pro autocomplete nebudeme zobrazovat error notifikaci, jen vrátíme prázdné pole
      return [];
    }
  }

  // Vylepšená funkce pro formátování adres včetně firem
  function formatAddress(item) {
    if (!item.address) return item.display_name;
    
    let parts = [];
    
    // Ulice/název + číslo domu
    if (item.address.road || item.address.street || item.address.neighbourhood) {
      let street = item.address.road || item.address.street || item.address.neighbourhood;
      let houseNumber = item.address.house_number || '';
      if (street && houseNumber) {
        parts.push(`${street} ${houseNumber}`);
      } else if (street) {
        parts.push(street);
      }
    }
    
    // Obec/město
    if (item.address.city || item.address.town || item.address.village || item.address.municipality) {
      parts.push(item.address.city || item.address.town || item.address.village || item.address.municipality);
    }
    
    // PSČ
    if (item.address.postcode) {
      parts.push(item.address.postcode);
    }
    
    // Detekce firmy/POI
    let businessName = '';
    
    // Kontrola všech možných zdrojů názvu firmy/POI
    if (item.namedetails && item.namedetails.name) {
      businessName = item.namedetails.name;
    } else if (item.name) {
      businessName = item.name;
    } else if (item.type === 'amenity' || item.type === 'shop' || item.type === 'office') {
      businessName = item.display_name.split(',')[0].trim();
    } else if (item.address && (item.address.amenity || item.address.shop || item.address.office)) {
      businessName = item.address.amenity || item.address.shop || item.address.office;
    }
    
    // Formátovaná adresa
    const formattedAddress = parts.join(', ');
    
    // Pokud jde o firmu, přidáme název firmy před adresu
    if (businessName && !parts.some(part => part.includes(businessName))) {
      return `${businessName}, ${formattedAddress}`;
    }
    
    // Jinak vrátíme jen adresu
    return formattedAddress;
  }

  // Upravená funkce pro zobrazení našeptávače
  async function showSuggestions(inputElem, suggestionElem) {
    const query = inputElem.value.trim();
    if (!query || query.length < 2) {
      suggestionElem.innerHTML = '';
      suggestionElem.classList.remove('active');
      return;
    }
    
    // Zobrazení našeptávače
    suggestionElem.classList.add('active');
    
    // Přidáme indikátor načítání
    suggestionElem.innerHTML = '<li style="text-align:center;font-style:italic;">Vyhledávám...</li>';
    
    // Získáme data z Nominatim API
    const suggestions = await fetchSuggestions(query);
    suggestionElem.innerHTML = '';
    
    if (suggestions.length === 0) {
      // Zobrazíme odkaz na Google Maps pro lepší vyhledávání firem
      const googleUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      suggestionElem.innerHTML = `
        <li style="text-align:center;font-style:italic;">Žádné výsledky nenalezeny</li>
        <li style="text-align:center;padding:8px;">
          <a href="${googleUrl}" target="_blank" style="color:#2196F3;">
            Hledat v Google Maps
          </a>
        </li>
      `;
      return;
    }
    
    suggestions.forEach(item => {
      const li = document.createElement('li');
      li.textContent = formatAddress(item);
      
      li.addEventListener('click', () => {
        inputElem.value = li.textContent;
        inputElem.dataset.lat = item.lat;
        inputElem.dataset.lon = item.lon;
        suggestionElem.innerHTML = '';
        suggestionElem.classList.remove('active');
      });
      suggestionElem.appendChild(li);
    });
  }

  // Inicializace vyhledávacích vstupů
  const startInput = document.getElementById('start');
  const endInput = document.getElementById('end');
  const startSuggestions = document.getElementById('start-suggestions');
  const endSuggestions = document.getElementById('end-suggestions');

  startInput.addEventListener('input', debounce(() => showSuggestions(startInput, startSuggestions), 400));
  endInput.addEventListener('input', debounce(() => showSuggestions(endInput, endSuggestions), 400));

  // Skrytí našeptávače při kliknutí mimo něj
  document.addEventListener('click', function(e) {
    if (!startInput.contains(e.target) && !startSuggestions.contains(e.target)) {
      startSuggestions.classList.remove('active');
    }
    if (!endInput.contains(e.target) && !endSuggestions.contains(e.target)) {
      endSuggestions.classList.remove('active');
    }
  });

  // Dynamické zastávky – vytvoření karty se vstupem pro adresu, fixaci a dobu přestávky
  const stopsContainer = document.getElementById('stops-container');
  function createStopField() {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'stop-field';

    // Label pro adresu
    const labelAddr = document.createElement('label');
    labelAddr.textContent = 'Adresa zastávky:';
    fieldDiv.appendChild(labelAddr);

    // Obal pro adresní input a našeptávač
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'stop-input-wrapper';
    fieldDiv.appendChild(inputWrapper);

    const stopInput = document.createElement('input');
    stopInput.type = 'text';
    stopInput.placeholder = 'např. Brno';
    stopInput.autocomplete = 'off';
    stopInput.spellcheck = false;
    stopInput.className = 'stop-input';
    inputWrapper.appendChild(stopInput);

    const suggestions = document.createElement('ul');
    suggestions.className = 'suggestions';
    inputWrapper.appendChild(suggestions);

    stopInput.addEventListener('input', debounce(() => showSuggestions(stopInput, suggestions), 400));

    // Skrytí našeptávače při kliknutí mimo něj
    document.addEventListener('click', function(e) {
      if (!stopInput.contains(e.target) && !suggestions.contains(e.target)) {
        suggestions.classList.remove('active');
      }
    });

    // Řádek pro fixaci času
    const fixRow = document.createElement('div');
    fixRow.className = 'fix-row';
    
    // Checkbox pro fixaci
    const fixCheckboxLabel = document.createElement('label');
    const fixCheckbox = document.createElement('input');
    fixCheckbox.type = 'checkbox';
    fixCheckbox.id = 'fix-' + Date.now();
    fixCheckboxLabel.appendChild(fixCheckbox);
    fixCheckboxLabel.appendChild(document.createTextNode('Fixovat čas příjezdu'));
    fixRow.appendChild(fixCheckboxLabel);
    
    // Vstup pro fixovaný čas – skrytý, dokud není checkbox zaškrtnutý
    const fixedTimeInput = document.createElement('input');
    fixedTimeInput.type = 'time';
    fixedTimeInput.className = 'fixed-time';
    fixedTimeInput.style.display = 'none';
    fixRow.appendChild(fixedTimeInput);
    
    // Toggle zobrazení fixovaného času
    fixCheckbox.addEventListener('change', function() {
      if (this.checked) {
        fixedTimeInput.style.display = 'block';
      } else {
        fixedTimeInput.style.display = 'none';
        fixedTimeInput.value = '';
      }
    });
    fieldDiv.appendChild(fixRow);

    // Label a vstup pro dobu přestávky
    const labelBreak = document.createElement('label');
    labelBreak.textContent = 'Přestávka (min):';
    fieldDiv.appendChild(labelBreak);

    const breakInput = document.createElement('input');
    breakInput.type = 'number';
    breakInput.value = 30;
    breakInput.min = 0;
    breakInput.className = 'break-time';
    breakInput.placeholder = '30';
    breakInput.title = "Délka přestávky v minutách";
    fieldDiv.appendChild(breakInput);

    // Tlačítko odstranění zastávky
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.className = 'remove-stop';
    removeBtn.title = 'Odstranit zastávku';
    removeBtn.addEventListener('click', () => {
      fieldDiv.remove();
    });
    fieldDiv.appendChild(removeBtn);

    return fieldDiv;
  }

  // Přidání počáteční zastávky a tlačítka pro přidání více zastávek
  stopsContainer.appendChild(createStopField());
  document.getElementById('add-stop').addEventListener('click', () => {
    stopsContainer.appendChild(createStopField());
    
    // Posuneme scrollbar na nově přidanou zastávku
    const newStopField = stopsContainer.lastElementChild;
    newStopField.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Inicializace mapy
  var map = L.map('map').setView([50.0755, 14.4378], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

// Geokódování adresy s vylepšeným error handlingem
  async function geocodeAddress(address, inputElem) {
    if (inputElem.dataset.lat && inputElem.dataset.lon) {
      return [parseFloat(inputElem.dataset.lat), parseFloat(inputElem.dataset.lon)];
    }
    
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(address)}`;
    
    try {
      // Kontrola online stavu
      if (!isOnline()) {
        throw new Error('Nejste připojeni k internetu.');
      }
      
      const response = await fetchWithRetry(url);
      const data = await response.json();
      
      if (data && data.length > 0) {
        inputElem.dataset.lat = data[0].lat;
        inputElem.dataset.lon = data[0].lon;
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      } else {
        throw new Error(`Adresa "${address}" nebyla nalezena. Zkuste ji upravit.`);
      }
    } catch (err) {
      console.error('Chyba při geokódování adresy:', err);
      throw new Error(getErrorMessage(err, 'při geokódování adresy'));
    }
  }

// Získání trasy s vylepšeným error handlingem
  async function fetchDrivingRoute(points) {
    const coords = points.map(pt => `${pt[1]},${pt[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
    
    try {
      // Kontrola online stavu
      if (!isOnline()) {
        throw new Error('Nejste připojeni k internetu.');
      }
      
      const response = await fetchWithRetry(url, {}, 2); // Max 2 retry pro routing
      const data = await response.json();
      
      if (data && data.routes && data.routes.length > 0) {
        return {
          geometry: data.routes[0].geometry,
          legs: data.routes[0].legs
        };
      } else if (data && data.code === 'NoRoute') {
        throw new Error('Mezi zadanými místy nebyla nalezena žádná cesta. Zkuste změnit zadané adresy.');
      } else {
        throw new Error('Nepodařilo se vypočítat trasu.');
      }
    } catch (err) {
      console.error('Chyba při načítání trasy z OSRM API:', err);
      throw new Error(getErrorMessage(err, 'při načítání trasy'));
    }
  }

  // Ukládání aktuální trasy
  let currentRoute = { start: null, stops: [], end: null };
  let currentMarkers = [];
  let currentPolyline = null;

// Plánování trasy
  document.getElementById('planRoute').addEventListener('click', async () => {
    const departureTimeStr = document.getElementById('departure').value;
    
    // Zpracování zastávek pro validaci
    const stopFields = stopsContainer.querySelectorAll('.stop-field');
    const stopsForValidation = [];
    
    for (let field of stopFields) {
      const stopInput = field.querySelector('.stop-input');
      if (stopInput.value.trim()) {
        const breakInput = field.querySelector('.break-time');
        const breakDuration = parseInt(breakInput.value) || 30;
        const fixCheckbox = field.querySelector('input[type="checkbox"]');
        const fixedTimeInput = field.querySelector('input.fixed-time');
        let fixed = false;
        let fixedTime = "";
        
        if (fixCheckbox && fixCheckbox.checked && fixedTimeInput.value) {
          fixed = true;
          fixedTime = fixedTimeInput.value;
        }
        
        stopsForValidation.push({
          addr: stopInput.value.trim(),
          break: breakDuration,
          fixed: fixed,
          fixedTime: fixedTime
        });
      }
    }
    
    // Validace vstupů
    const validation = validateInputs(
      startInput.value,
      endInput.value,
      departureTimeStr,
      stopsForValidation
    );
    
    if (!validation.valid) {
      showError(validation.message);
      return;
    }

    // Zobrazení indikátoru načítání
    const planBtn = document.getElementById('planRoute');
    const originalBtnText = planBtn.innerHTML;
    planBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Plánuji trasu...';
    planBtn.disabled = true;

try {
      // Kontrola online stavu před začátkem
      if (!isOnline()) {
        throw new Error('Nejste připojeni k internetu. Zkontrolujte prosím své připojení.');
      }

      // Geokódování startu a cíle
      let startCoords, endCoords;
      
      try {
        startCoords = await geocodeAddress(startInput.value, startInput);
      } catch (err) {
        throw new Error(`Chyba při geokódování startu: ${err.message}`);
      }
      
      try {
        endCoords = await geocodeAddress(endInput.value, endInput);
      } catch (err) {
        throw new Error(`Chyba při geokódování cíle: ${err.message}`);
      }
      
      if (!startCoords || !endCoords) {
        throw new Error('Nepodařilo se najít zadané adresy. Zkuste je upravit.');
      }
      
      currentRoute.start = { coords: startCoords, addr: startInput.value };
      currentRoute.end = { coords: endCoords, addr: endInput.value };

      // Zpracování zastávek
      currentRoute.stops = [];
      for (let i = 0; i < stopFields.length; i++) {
        const field = stopFields[i];
        const stopInput = field.querySelector('.stop-input');
        
        if (stopInput.value.trim()) {
          try {
            const coords = await geocodeAddress(stopInput.value, stopInput);
            const breakInput = field.querySelector('.break-time');
            const breakDuration = parseInt(breakInput.value) || 30;
            const fixCheckbox = field.querySelector('input[type="checkbox"]');
            const fixedTimeInput = field.querySelector('input.fixed-time');
            let fixed = false;
            let fixedTime = "";
            
            if (fixCheckbox && fixCheckbox.checked && fixedTimeInput.value) {
              fixed = true;
              fixedTime = fixedTimeInput.value;
            }
            
            if (coords) {
              currentRoute.stops.push({ coords, addr: stopInput.value, break: breakDuration, fixed, fixedTime });
            }
          } catch (err) {
            throw new Error(`Chyba při geokódování zastávky ${i + 1}: ${err.message}`);
          }
        }
      }

      // Sestavení trasy
      let routePoints = [currentRoute.start.coords];
      currentRoute.stops.forEach(s => routePoints.push(s.coords));
      routePoints.push(currentRoute.end.coords);

      // Vyčištění mapy
      clearMap();

      // Přidání markerů
      addMarker(startCoords, "Start: " + startInput.value, 'start');
      currentRoute.stops.forEach((stop, i) => {
        addMarker(stop.coords, "Zastávka " + (i + 1) + ": " + stop.addr, 'stop');
      });
      addMarker(endCoords, "Cíl: " + endInput.value, 'end');

      // Získání trasy z OSRM API
      let routeData;
      try {
        routeData = await fetchDrivingRoute(routePoints);
      } catch (err) {
        // Ponecháme markery na mapě, ale odstraníme je jen pokud se načítání úplně nezdařilo
        throw err;
      }
      
      if (!routeData) {
        throw new Error('Nepodařilo se načíst trasu. Zkuste to prosím znovu.');
      }
      
      const routeCoords = routeData.geometry.coordinates.map(c => [c[1], c[0]]);
      currentPolyline = L.polyline(routeCoords, { color: 'blue', weight: 5, opacity: 0.7 }).addTo(map);
      
      // Zoom na celou trasu
      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [50, 50] });

      // Výpočet harmonogramu
      calculateSchedule(routeData, departureTimeStr);

      // Zobrazení úspěšné zprávy
      showSuccess('Trasa byla úspěšně naplánována!');

      // Zavřít sidebar na mobilních zařízeních po úspěšném naplánování
      if (window.innerWidth < 992) {
        toggleSidebar();
      }
    } catch (error) {
      // Zpracování chyby s user-friendly zprávou
      const errorMessage = getErrorMessage(error, 'při plánování trasy');
      showError(errorMessage);
      console.error('Chyba při plánování trasy:', error);
    } finally {
      // Obnovení tlačítka
      planBtn.innerHTML = originalBtnText;
      planBtn.disabled = false;
    }
      // Obnovení tlačítka
      planBtn.innerHTML = originalBtnText;
      planBtn.disabled = false;
    }
  });

  // === ERROR HANDLING A OFFLINE DETEKCE ===

  // Detekce offline stavu
  function isOnline() {
    return navigator.onLine;
  }

  // Zobrazení warning zprávy
  function showWarning(message) {
    const warningNotification = document.createElement('div');
    warningNotification.className = 'notification warning-notification';
    warningNotification.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    document.body.appendChild(warningNotification);
    
    setTimeout(() => {
      warningNotification.classList.add('hide');
      setTimeout(() => warningNotification.remove(), 300);
    }, 5000);
  }

  // Vylepšené fetch s timeout a retry logikou
  async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Retry logika pro API volání
  async function fetchWithRetry(url, options = {}, maxRetries = 2) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetchWithTimeout(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response;
      } catch (error) {
        lastError = error;
        
        // Pokud je to abort/timeout a máme ještě pokusy, zkusíme znovu
        if (i < maxRetries && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponenciální backoff
          continue;
        }
        
        // Jinak hodíme chybu
        throw error;
      }
    }
    
    throw lastError;
  }

  // Zpracování různých typů chyb
  function getErrorMessage(error, context = '') {
    // Kontrola offline stavu
    if (!isOnline()) {
      return 'Nejste připojeni k internetu. Zkontrolujte prosím své připojení.';
    }
    
    // Timeout chyby
    if (error.name === 'AbortError') {
      return `Požadavek trval příliš dlouho. ${context ? context + ' ' : ''}Zkuste to prosím znovu.`;
    }
    
    // Network chyby
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Nepodařilo se připojit k serveru. Zkontrolujte své internetové připojení.';
    }
    
    // HTTP chyby
    if (error.message.includes('HTTP error')) {
      const status = error.message.match(/status: (\d+)/)?.[1];
      switch (status) {
        case '404':
          return 'Požadovaná data nebyla nalezena.';
        case '429':
          return 'Příliš mnoho požadavků. Prosím počkejte chvíli a zkuste to znovu.';
        case '500':
        case '502':
        case '503':
          return 'Server je dočasně nedostupný. Zkuste to prosím později.';
        default:
          return `Chyba serveru (${status}). Zkuste to prosím znovu.`;
      }
    }
    
    // OSRM specifické chyby
    if (context.includes('trasa') && error.message.includes('No route found')) {
      return 'Nepodařilo se najít trasu mezi zadanými místy. Zkuste změnit zadané adresy.';
    }
    
    // Geokódování chyby
    if (context.includes('geokódování')) {
      return 'Nepodařilo se najít zadanou adresu. Zkuste ji upravit nebo použít jinou.';
    }
    
    // Obecná chyba
    return error.message || 'Nastala neočekávaná chyba. Zkuste to prosím znovu.';
  }

  // Listener pro změnu online/offline stavu
  window.addEventListener('online', () => {
    showSuccess('Připojení k internetu bylo obnoveno.');
  });

  window.addEventListener('offline', () => {
    showWarning('Ztratili jste připojení k internetu.');
  });
  
  // Přidání markeru na mapu
  function addMarker(coords, popupText, type) {
    const markerOptions = {};
    
    // Ikony pro různé typy bodů
    if (type === 'start') {
      markerOptions.icon = L.divIcon({
        className: 'custom-marker start-marker',
        html: '<i class="fas fa-flag-checkered"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      });
    } else if (type === 'end') {
      markerOptions.icon = L.divIcon({
        className: 'custom-marker end-marker',
        html: '<i class="fas fa-map-marker-alt"></i>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      });
    } else {
      markerOptions.icon = L.divIcon({
        className: 'custom-marker stop-marker',
        html: '<i class="fas fa-map-pin"></i>',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
      });
    }
    
    const marker = L.marker(coords, markerOptions).addTo(map);
    marker.bindPopup(popupText);
    currentMarkers.push(marker);
    return marker;
  }

  // Vyčištění mapy
  function clearMap() {
    // Odstranění markerů
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];
    
    // Odstranění polyline
    if (currentPolyline) {
      map.removeLayer(currentPolyline);
      currentPolyline = null;
    }
  }

  // Výpočet harmonogramu
  function calculateSchedule(routeData, departureTimeStr) {
    let scheduleItems = [];
    let cumulativeDistance = 0;
    let departureTime = new Date();
    const [depH, depM] = departureTimeStr.split(':').map(Number);
    departureTime.setHours(depH, depM, 0, 0);
    
    scheduleItems.push({
      label: "Odjezd ze Start (" + currentRoute.start.addr + ")",
      time: new Date(departureTime),
      segment: "",
      cumulative: "0 km"
    });
    
    let currentTime = new Date(departureTime);
    
    for (let i = 0; i < routeData.legs.length; i++) {
      const leg = routeData.legs[i];
      const travelTimeMs = leg.duration * 1000;
      const legDistanceMeters = leg.distance;
      const legDistanceStr = (legDistanceMeters / 1000).toFixed(1) + " km";
      cumulativeDistance += legDistanceMeters;
      const cumulativeStr = (cumulativeDistance / 1000).toFixed(1) + " km";
      
      // Pokud existuje fixace pro tuto zastávku, použijeme ji
      if (i < currentRoute.stops.length && currentRoute.stops[i].fixed && currentRoute.stops[i].fixedTime) {
        // Převod fixovaného času (HH:MM) na Date (s použitím stejného dne jako odjezd)
        const [fixH, fixM] = currentRoute.stops[i].fixedTime.split(':').map(Number);
        currentTime = new Date(departureTime.getFullYear(), departureTime.getMonth(), departureTime.getDate(), fixH, fixM, 0, 0);
      } else {
        currentTime = new Date(currentTime.getTime() + travelTimeMs);
      }
  
      if (i < currentRoute.stops.length) {
        scheduleItems.push({
          label: "Příjezd do Zastávky " + (i + 1) + " (" + currentRoute.stops[i].addr + ")",
          time: new Date(currentTime),
          segment: legDistanceStr,
          cumulative: cumulativeStr,
          fixed: currentRoute.stops[i].fixed
        });
        const breakMs = currentRoute.stops[i].break * 60 * 1000;
        currentTime = new Date(currentTime.getTime() + breakMs);
        scheduleItems.push({
          label: "Odjezd ze Zastávky " + (i + 1) + " (" + currentRoute.stops[i].addr + ")",
          time: new Date(currentTime),
          segment: "",
          cumulative: cumulativeStr
        });
      } else {
        scheduleItems.push({
          label: "Příjezd do Cíle (" + currentRoute.end.addr + ")",
          time: new Date(currentTime),
          segment: legDistanceStr,
          cumulative: cumulativeStr
        });
      }
    }
  
    // Generování harmonogramu
    generateSchedule(scheduleItems);
  }
  
  // Nová implementace pro generování kompaktního harmonogramu
  function generateSchedule(scheduleItems) {
    const scheduleBody = document.getElementById("schedule-body");
    scheduleBody.innerHTML = "";
    
    // Zpracování položek harmonogramu
    const organizedItems = organizeScheduleItems(scheduleItems);
    
    // Vygenerování řádků harmonogramu
    organizedItems.forEach(item => {
      const row = document.createElement('tr');
      
      // Nastavení třídy řádku podle typu bodu
      if (item.type === 'start') {
        row.className = "start-point";
      } else if (item.type === 'stop') {
        row.className = "stop-point";
        
        // Přidání třídy pro fixovaný čas, pokud existuje
        if (item.fixed) {
          row.className += " fixed-time";
        }
      } else if (item.type === 'end') {
        row.className = "end-point";
      }
      
      // Formátování časů
      const arrivalTime = item.arrivalTime ? formatTime(item.arrivalTime) : "-";
      const departureTime = item.departureTime ? formatTime(item.departureTime) : "-";
      
      // Vytvoření buněk řádku
      row.innerHTML = `
        <td class="place-cell">${item.name}</td>
        <td class="time-cell">${arrivalTime}</td>
        <td class="time-cell">${departureTime}</td>
        <td class="measure-cell">${item.segment || "-"}</td>
        <td class="measure-cell">${item.cumulative}</td>
      `;
      
      scheduleBody.appendChild(row);
    });
    
    // Zobrazení harmonogramu a export tlačítek
    document.getElementById("schedule").style.display = "block";
    document.getElementById('export-buttons').style.display = 'flex';
  }

  // Funkce pro organizaci položek harmonogramu
  function organizeScheduleItems(items) {
    // Připravíme výsledné pole
    const result = [];
    
    // Najdeme první položku (odjezd ze startu)
    const startItem = items.find(item => item.label.includes("Odjezd ze Start"));
    if (startItem) {
      result.push({
        type: 'start',
        name: extractPlace(startItem.label, "Odjezd ze Start"),
        departureTime: startItem.time,
        arrivalTime: null,
        segment: "",
        cumulative: startItem.cumulative
      });
    }
    
    // Zpracování zastávek
    let i = 0;
    while (i < items.length) {
      const item = items[i];
      
      // Příjezd do zastávky
      if (item.label.includes("Příjezd do Zastávky")) {
        const stopIndex = extractStopIndex(item.label);
        const placeName = extractPlace(item.label, "Příjezd do Zastávky " + stopIndex);
        
        // Hledáme odpovídající odjezd
        const departureItem = items.find(dep => 
          dep.label.includes("Odjezd ze Zastávky " + stopIndex) && 
          extractPlace(dep.label, "Odjezd ze Zastávky " + stopIndex) === placeName
        );
        
        result.push({
          type: 'stop',
          name: placeName,
          arrivalTime: item.time,
          departureTime: departureItem ? departureItem.time : null,
          segment: item.segment,
          cumulative: item.cumulative,
          fixed: item.fixed
        });
      }
      
      i++;
    }
    
    // Najdeme poslední položku (příjezd do cíle)
    const endItem = items.find(item => item.label.includes("Příjezd do Cíle"));
    if (endItem) {
      result.push({
        type: 'end',
        name: extractPlace(endItem.label, "Příjezd do Cíle"),
        arrivalTime: endItem.time,
        departureTime: null,
        segment: endItem.segment,
        cumulative: endItem.cumulative
      });
    }
    
    return result;
  }

  // Pomocná funkce pro extrakci místa z popisu
  function extractPlace(label, prefix) {
    // Odstraní prefix a závorky
    return label.replace(prefix + " (", "").replace(")", "");
  }

  // Pomocná funkce pro extrakci čísla zastávky
  function extractStopIndex(label) {
    const match = label.match(/Zastávky (\d+)/);
    return match ? match[1] : "";
  }

  // Formátování času
  function formatTime(date) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  // Výpočet trvání přestávky
  function calculateDuration(arrivalTime, departureTime) {
    const diff = departureTime.getTime() - arrivalTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }
  
  // Export do Google Maps
  document.getElementById('export-google').addEventListener('click', () => {
    if (!currentRoute.start || !currentRoute.end) return;
    const s = currentRoute.start.coords;
    const e = currentRoute.end.coords;
    let googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${s[0]},${s[1]}&destination=${e[0]},${e[1]}`;
    if (currentRoute.stops.length > 0) {
      const waypoints = currentRoute.stops.map(stop => `${stop.coords[0]},${stop.coords[1]}`).join('|');
      googleUrl += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    window.open(googleUrl, '_blank');
  });
  
  // Funkce pro tisk harmonogramu
  function printSchedule() {
    window.print();
  }

  // Aktualizovaná funkce pro kopírování harmonogramu do schránky
  function copyScheduleToClipboard() {
    const scheduleTable = document.querySelector('.schedule-container');
    const rows = scheduleTable.querySelectorAll('tbody tr');
    let textContent = "ČASOVÝ HARMONOGRAM CESTY\n\n";
    
    rows.forEach(row => {
      const columns = row.querySelectorAll('td');
      const place = columns[0].textContent;
      const arrival = columns[1].textContent;
      const departure = columns[2].textContent;
      const segment = columns[3].textContent;
      const distance = columns[4].textContent;
      
      // Určení typu řádku pro lepší formátování
      if (row.classList.contains('start-point')) {
        textContent += `START: ${place}\n`;
        textContent += `Odjezd: ${departure}\n`;
      } else if (row.classList.contains('end-point')) {
        textContent += `CÍL: ${place}\n`;
        textContent += `Příjezd: ${arrival}\n`;
      } else {
        textContent += `ZASTÁVKA: ${place}\n`;
        textContent += `Příjezd: ${arrival} | Odjezd: ${departure}\n`;
      }
      
      textContent += `Vzdálenost: ${distance}\n\n`;
    });
    
    const copyContent = document.getElementById('copy-content');
    copyContent.value = textContent;
    copyContent.select();
    document.execCommand('copy');
    
    // Notifikace o zkopírování
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = 'Harmonogram byl zkopírován do schránky!';
    document.body.appendChild(notification);
    
    // Automaticky zmizí po 3 sekundách
    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Funkce pro export do PDF
  function exportScheduleToPDF() {
    // Pro jednoduchost zatím nabídneme tisk
    window.print();
  }

  // Přidání posluchačů událostí
  document.getElementById('print-schedule').addEventListener('click', printSchedule);
  document.getElementById('copy-schedule').addEventListener('click', copyScheduleToClipboard);
  document.getElementById('export-schedule-pdf').addEventListener('click', exportScheduleToPDF);

  // Speciální detekce pro iOS zařízení
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    // Oprava pro iOS specifické problémy
    const iOSFixes = document.createElement('style');
    iOSFixes.textContent = `
      /* iOS specifické opravy */
      body {
        -webkit-overflow-scrolling: touch;
      }
      
      .map-container {
        height: calc(100vh - 3.5rem); /* iOS má problémy s calc() v kombinaci s --vh */
      }
      
      input[type="text"], 
      input[type="time"], 
      input[type="number"] {
        font-size: 16px; /* Zabránit zoomování formuláře na iOS */
      }
    `;
    document.head.appendChild(iOSFixes);
    
    // Musíme také upravit výšku pro iOS
    function fixIOSHeight() {
      const mapContainer = document.querySelector('.map-container');
      const sidebar = document.getElementById('planForm');
      const viewportHeight = window.innerHeight;
      
      mapContainer.style.height = `${viewportHeight - 56}px`; // 3.5rem = 56px
      sidebar.style.height = `${viewportHeight - 56}px`;
    }
    
    window.addEventListener('resize', fixIOSHeight);
    window.addEventListener('orientationchange', () => {
      // Krátké zpoždění, aby se iOS orientace ustálila
      setTimeout(fixIOSHeight, 300);
    });
    
    fixIOSHeight();
  }
});
