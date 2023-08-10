
/**
 * Creates vCards in version 3 or version 4
 * Version 3 is defined in rfc2426 | https://www.rfc-editor.org/rfc/rfc2426
 * Version 4 is defined in rfc6350 | https://www.rfc-editor.org/rfc/rfc6350
 * See also: https://www.w3.org/2002/12/cal/vcard-notes.html
 * 
 * Written by Rob Parham, August 2023
 * MIT License
 */
export class VCard {

	constructor() {
		this.specVersion = 4;
		this.kind = null;
		this.name = [];
		this.nickname = [];
		this.photo = [];
		this.bday = null;
		this.anniversary = null;
		this.gender = null;
		this.gender_ident = null;
		this.address = [];
		this.tel = [];
		this.email = [];
		this.impp = [];
		this.title = [];
		this.role = [];
		this.logo = [];
		this.org = [];
		this.note = [];
		this.url = [];

		this.emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		this.dataUriRegex = /^data:image\/([^;]*);base64,(.*)$/;
	}
	
	/**
	 * Escape comma, semicolon, colon, backslash and newlines and fold lines 
	 * at no more than 75 bytes per line, while keeping multi-byte characters 
	 * intact. This implementation uses tokens to represent comma, semicolon, 
	 * colon, and backslash which are converted to their literals and not 
	 * escaped.
	 * 
	 * Version 3 and version 4 appear to be handle escaping and line folding 
	 * identically.
	 * 
	 * Version 4 is defined here:
	 * 		rfc6350 3.2 line delimiting and folding
	 * 		rfc6350 3.4 property value escaping
	 * 
	 * Version 3 is defined here:
	 * 		rfc2425 5.8.1 line delimiting and folding
	 * 		rfc2426 4 formal grammar
	 */
	formatTextValue(str) {
		var chars = [...str];
		var max_line_bytes = 75;
		var lines = [];
		var curr_line = [];
		var curr_line_bytes = 0;
		for (let i = 0; i < chars.length; i++) {
			var char = chars[i];
			if (char === ',') char = '\\,';
			if (char === ';') char = '\\;';
			if (char === ':') char = '\\:';
			if (char === '\\') char = '\\\\';
			if (char === "\n") char = '\\n';

			if (char === '%') {
				let token = chars.slice(i, i + 5).join('');
				switch (token) {
					case '%COM%':
						char = ',';
						i += 4;
						break;
					case '%SEM%':
						char = ';';
						i += 4;
						break;
					case '%COL%':
						char = ':';
						i += 4;
						break;
					case '%BAC%':
						char = '\\';
						i += 4;
						break;
				}
			}

			var char_bytes = new Blob([char]).size;
			if (curr_line_bytes + char_bytes > max_line_bytes) {
				lines.push(curr_line.join(''));
				curr_line = [' ', char];
				curr_line_bytes = 1 + char_bytes;
			} else {
				curr_line.push(char);
				curr_line_bytes += char_bytes;
			}
		}
		lines.push(curr_line.join(''));
		return lines.join("\n");
	}

	formatDate(date) {
		var [y, m, d, h, min, sec, ms] = date.toISOString().split(/[^\d]+/);
		if(this.specVersion === 4){
			return `${y}${m}${d}T${h}${min}${sec}Z`;
		}else{
			return `${y}-${m}-${d}T${h}:${min}:${sec}Z`;
		}
	}

	setVersion(version){
		if(version !== 3 && version !== 4){
			throw new Error('Unsupported version: '+version);
		}
		this.specVersion = version;
		return this;
	}

	setNickname(nickname) {
		this.nickname.push(nickname);
		return this;
	}

	setName(name) {
		this.name.push(name.replace(/\s+/g, ' ').trim());
		return this;
	}

	/**
	 * Supported in v4 only, ignored in v3
	 */
	setKind(kind) {
		kind = kind.trim().toLowerCase();
		let allowed_values = [
			VCard.KIND_IND,
			VCard.KIND_GRP,
			VCard.KIND_ORG,
			VCard.KIND_LOC
		];
		if (!allowed_values.includes(kind)) {
			throw new Error("Invalid Kind value.");
		}
		this.kind = kind;
		return this;
	}

	/**
	 * Requires a Data URI, which will be converted to 
	 * the appropriate format upon rendering.
	 */
	setPhoto(dataURI) {
		if(!this.dataUriRegex.test(dataURI)){
			throw new Error("Invalid Image Data URI");
		}
		this.photo.push(dataURI);
		return this;
	}

	setBday(bday) {
		if (!(bday instanceof Date)) {
			throw new Error("Invalid Birthday date");
		}
		this.bday = bday;
		return this;
	}

	/**
	 * Supported in v4 only, ignored in v3
	 */
	setAnniversary(anniversary) {
		if (!(anniversary instanceof Date)) {
			throw new Error("Invalid Anniversary date");
		}
		this.anniversary = anniversary;
		return this;
	}

	/**
	 * Supported in v4 only, ignored in v3
	 */
	setGender(gender, ident = null) {
		gender = gender;
		if (ident) ident = ident.trim().toLowerCase();
		let allowed_values = [
			VCard.GENDER_MAL,
			VCard.GENDER_FEM,
			VCard.GENDER_OTH,
			VCard.GENDER_NON,
			VCard.GENDER_UNK
		];
		if (!allowed_values.includes(gender)) {
			throw new Error("Invalid Gender value.");
		}
		this.gender = gender;
		this.gender_ident = ident;
		return this;
	}

	setAddress(street = '', city = '', state = '', zip = '', country = '', label = '') {
		this.address.push({ street, city, state, zip, country, label });
		return this;
	}

	/**
	 * Extention param supported in v4 only, ignored in v3
	 */
	setPhone(phone, ext='', type=[], pref=false){
		if(typeof type === 'string') type = [type];
		let allowed_type_values = [
			VCard.TEL_TYPE_TXT,
			VCard.TEL_TYPE_VCE,
			VCard.TEL_TYPE_FAX,
			VCard.TEL_TYPE_CEL,
			VCard.TEL_TYPE_VID,
			VCard.TEL_TYPE_PAG,
			VCard.TEL_TYPE_TPH
		];
		for(let i=0; i<type.length; i++){
			if (!allowed_type_values.includes(type[i])) {
				throw new Error("Invalid Type value.");
			}
		}
		if(pref){
			for(let i=0; i<this.tel.length; i++){
				this.tel[i].pref = false;
			}
		}
		this.tel.push({phone, ext, type, pref: !!pref});
		return this;
	}

	setEmail(email, pref=false){
		if(!this.emailRegex.test(email.toLowerCase())){
			throw new Error("Invalid Email value.");
		}
		if(pref){
			for(let i=0; i<this.email.length; i++){
				this.email[i].pref = false;
			}
		}
		this.email.push({email, pref: !!pref});
		return this;
	}

	/**
	 * Supported in v4 only, ignored in v3
	 */
	setIM(imurl, protocol, pref){

		const allowed_protocols = [
			VCard.IM_PROTOCOL_SIP,
			VCard.IM_PROTOCOL_XMP,
			VCard.IM_PROTOCOL_IRC,
			VCard.IM_PROTOCOL_YMS,
			VCard.IM_PROTOCOL_MSN,
			VCard.IM_PROTOCOL_AIM,
			VCard.IM_PROTOCOL_IM
		];

		if (!allowed_protocols.includes(protocol)) {
			throw new Error("Invalid Protocol value.");
		}

		if(pref){
			for(let i=0; i<this.impp.length; i++){
				this.impp[i].pref = false;
			}
		}
		this.impp.push({imurl, protocol, pref: !!pref});
		return this;
	}

	setTitle(title){
		this.title.push(title);
		return this;
	}

	setRole(role){
		this.role.push(role);
		return this;
	}

	setLogo(dataURI) {
		if(!this.dataUriRegex.test(dataURI)){
			throw new Error("Invalid Image Data URI");
		}
		this.logo.push(dataURI);
		return this;
	}

	setOrg(org1, org2, org3){
		var org = [];
		if(org1) org.push(org1);
		if(org2) org.push(org2);
		if(org3) org.push(org3);
		this.org.push(org);
		return this;
	}

	setNote(note){
		this.note.push(note);
		return this;
	}

	setURL(url){
		this.url.push(url);
		return this;
	}

	async render() {
		const getGroup = (()=>{
			let group = 0;
			return ()=>{
				group++;
				return `item${group}.`;
			};
		})();

		if(this.specVersion === 4){
			if (!this.kind) {
				throw new Error('Missing Kind property (Required in Version 4)');
			}
		}
		
		if (!this.name.length) {
			throw new Error("Missing Name property.");
		}

		var parts = [];
		parts.push('BEGIN:VCARD');
		parts.push(`VERSION:${this.specVersion}.0`);

		if(this.specVersion === 4){
			parts.push(`KIND:${this.kind}`);
		}

		for (let i = 0; i < this.name.length; i++) {
			parts.push(this.formatTextValue(`FN%COL%${this.name[i]}`));
			if(i === 0){
				let name_parts = this.name[i].split(' ');
				let name = name_parts.pop();
				let last_name = name_parts.join(' ');
				if(last_name) name += `%SEM%${last_name}`;
				parts.push(this.formatTextValue(`N%COL%${name}`));
			}
		}

		if (this.nickname.length) {
			for(let i=0; i<this.nickname.length; i++){
				if(!this.nickname[i].trim()) continue;
				parts.push(`NICKNAME:${this.formatTextValue(this.nickname[i])}`);
			}
		}

		for (let i = 0; i < this.photo.length; i++) {
			let photo = this.photo[i];
			if(this.specVersion === 4){
				photo = photo.replace(/\:/g, '%COL%').replace(/\;/g, '%SEM%').replace(/\,/g, '%COM%').replace(/\\/g, '%BAC%');
				parts.push(this.formatTextValue(`PHOTO%COL%${photo}`));
			}else{
				let [_, type, data] = photo.match(this.dataUriRegex);
				data = data.replace(/\:/g, '%COL%').replace(/\;/g, '%SEM%').replace(/\,/g, '%COM%').replace(/\\/g, '%BAC%');
				parts.push(this.formatTextValue(`PHOTO%SEM%ENCODING=b%SEM%TYPE=${type.toUpperCase()}%COL%${data}`));
			}
		}

		if (this.bday) {
			parts.push(`BDAY:${this.formatDate(this.bday)}`);
		}

		if(this.specVersion === 4){
			if (this.anniversary) {
				parts.push(`ANNIVERSARY:${this.formatDate(this.anniversary)}`);
			}
		}

		if(this.specVersion === 4){
			if (this.gender) {
				let gender = this.gender;
				if (this.gender_ident) gender += `%SEM%${this.gender_ident}`;
				parts.push(this.formatTextValue(`GENDER%COL%${gender}`));
			}
		}

		for (let i = 0; i < this.address.length; i++) {
			let group = '';
			if(this.specVersion === 3){
				group = getGroup();
			}

			let adr = `${group}ADR`;

			if(this.specVersion === 4){
				if (this.address[i].label) {
					adr += `%SEM%LABEL=${this.address[i].label}`;
				}
			}
			
			adr += `%COL%%SEM%%SEM%`;
			
			if(this.address[i].street){
				adr += this.address[i].street;
			}
			adr += `%SEM%`;

			if(this.address[i].city){
				adr += this.address[i].city;
			}
			adr += `%SEM%`;

			if(this.address[i].state){
				adr += this.address[i].state;
			}
			adr += `%SEM%`;

			if(this.address[i].zip){
				adr += this.address[i].zip;
			}
			adr += `%SEM%`;

			if(this.address[i].country){
				adr += this.address[i].country;
			}

			parts.push(this.formatTextValue(adr));

			if(this.specVersion === 3){
				parts.push(this.formatTextValue(`${group}X-ABLabel%COL%${this.address[i].label}`));
			}
		}

		let phone_type_map = {
			text: 'cell',
			voice: 'voice',
			fax: 'fax',
			cell: 'cell',
			video: 'video',
			pager: 'pager',
			textphone: ''
		};

		for(let i=0; i<this.tel.length; i++){
			let tel = 'TEL';

			if(this.specVersion === 4){
				tel += '%SEM%VALUE=uri';
				if(this.tel[i].pref){
					tel += `%SEM%PREF=1`;
				}
			}

			if(this.tel[i].type.length){
				let type = this.tel[i].type;
				if(this.specVersion === 3){
					type = type.map(t=>phone_type_map[t]).filter(t=>!!t);
					if(this.tel[i].pref){
						type.push('pref');
					}
				}
				tel += `%SEM%TYPE=${type.join('%COM%')}`;
			}

			let ph_parts = this.tel[i].phone.replace(/[^\d]/g, '').substring(0, 10).match(/^(\d{0,3})(\d{0,3})(\d{0,4})/);

			if(this.specVersion === 4){
				tel += `%COL%tel%COL%+1-${ph_parts[1]}-${ph_parts[2]}-${ph_parts[3]}`;
			}else{
				tel += `%COL%+1-${ph_parts[1]}-${ph_parts[2]}-${ph_parts[3]}`;
			}

			if(this.specVersion === 4 && this.tel[i].ext){
				tel += `%SEM%ext=${this.tel[i].ext}`;
			}

			parts.push(this.formatTextValue(tel));
		}

		for(let i=0; i<this.email.length; i++){
			let em = 'EMAIL';
			
			if(this.specVersion === 4){
				if(this.email[i].pref){
					em += '%SEM%PREF=1';
				}
			}else{
				em += '%SEM%TYPE=internet';
				if(this.email[i].pref){
					em += '%COM%pref';
				}
			}
			
			em += `%COL%${this.email[i].email}`;
			parts.push(this.formatTextValue(em));
		}

		if(this.specVersion === 4){
			for(let i=0; i<this.impp.length; i++){
				let impp = 'IMPP';
				if(this.impp[i].pref){
					impp += '%SEM%PREF=1';
				}
				impp += `%COL%${this.impp[i].protocol}%COL%${this.impp[i].imurl}`;
				parts.push(this.formatTextValue(impp));
			}
		}

		for(let i=0; i<this.title.length; i++){
			parts.push(this.formatTextValue(`TITLE%COL%${this.title[i]}`));
		}

		for(let i=0; i<this.role.length; i++){
			parts.push(this.formatTextValue(`ROLE%COL%${this.role[i]}`));
		}

		for (let i = 0; i < this.logo.length; i++) {
			let logo = this.logo[i];
			if(this.specVersion === 4){
				logo = logo.replace(/\:/g, '%COL%').replace(/\;/g, '%SEM%').replace(/\,/g, '%COM%').replace(/\\/g, '%BAC%');
				parts.push(this.formatTextValue(`LOGO%COL%${logo}`));
			}else{
				let [_, type, data] = logo.match(this.dataUriRegex);
				data = data.replace(/\:/g, '%COL%').replace(/\;/g, '%SEM%').replace(/\,/g, '%COM%').replace(/\\/g, '%BAC%');
				parts.push(this.formatTextValue(`LOGO%SEM%ENCODING=b%SEM%TYPE=${type.toUpperCase()}%COL%${data}`));
			}
		}

		for(let i=0; i<this.org.length; i++){
			parts.push(this.formatTextValue(`ORG%COL%${this.org[i].join(`%SEM%`)}`));
		}

		for(let i=0; i<this.note.length; i++){
			parts.push(this.formatTextValue(`NOTE%COL%${this.note[i]}`));
		}

		for(let i=0; i<this.url.length; i++){
			parts.push(`URL:${this.url[i]}`);
		}

		parts.push('END:VCARD');

		return parts.join("\n");
	}

	tokenizeVcardString(str){
		const unesc = str => str.replace(/\\,/g, ',')
			.replace(/\\;/g, ';')
			.replace(/\\:/g, ':')
			.replace(/\\\\/g, '\\')
			.replace(/\\n/g, "\n");

		let tokens = str.replace(/\n /g, '').split(/\n+/g).map(line=>{
			var [key_props, ...values] = line.match(/(\\.|[^:])+/g);
			values = values.join(":").match(/(\\.|[^;])+/g).map(unesc);

			var [key, ...props] = key_props.match(/(\\.|[^;])+/g);
			key = unesc(key);

			props = props.map(prop=>{
				let [property, values] = prop.match(/(\\.|[^=])+/g);
				property = unesc(property);

				values = values.match(/(\\.|[^,])+/g).map(unesc);
				return {property, values};
			});

			return {key, props, values};
		});

		// Combine groups into single tokens
		let label_map = {};
		for(let i=0; i<tokens.length; i++){
			if(tokens[i].key.indexOf(".") > -1){
				let [label, key] = tokens[i].key.split(".");
				if(!label_map.hasOwnProperty(label)){
					tokens[i].key = key;
					label_map[label] = i;
				}else{
					if(key === "X-ABLabel") key = "LABEL";
					tokens[label_map[label]].props.push({
						property: key, 
						values: tokens[i].values
					});
				}
			}
		}
		tokens = tokens.filter(t=>t.key.indexOf(".") === -1);
		return tokens;
	}

	fromText(str){
		let tokens = this.tokenizeVcardString(str);
		
		// Check first & last lines
		let begin = tokens.shift();
		if(begin.key.toUpperCase() !== "BEGIN" || !begin.values[0] || begin.values[0].toUpperCase() !== "VCARD"){
			throw new Error("Invalid vCard");
		}
		let end = tokens.pop();
		if(end.key.toUpperCase() !== "END" || !end.values[0] || end.values[0].toUpperCase() !== "VCARD"){
			throw new Error("Invalid vCard");
		}

		let version_line = tokens.shift();
		if(version_line.key.toUpperCase() !== "VERSION" || !version_line.values[0] || !["3.0", "4.0"].includes(version_line.values[0])){
			throw new Error("Incompatible vCard version.");
		}

		let version = parseInt(version_line.values[0]);

		for(let token_index = 0; token_index<tokens.length; token_index++){
			let token = tokens[token_index];
			if(!token.key || !token.values || !token.values.length){
				throw new Error("Invalid vCard (Invalid token)");
			}
			switch(token.key.toUpperCase()){
				case "N": break;
				case "FN":
					this.setName(token.values[0]);
					break;
				case "NICKNAME":
					token.values.forEach(n=>{
						this.setNickname(n);
					});
					break;
				case "PHOTO":
					if(version === 3){
						let type_prop = token.props.filter(p=>p.property.toUpperCase() === "TYPE");
						if(!type_prop.length || !type_prop[0].values || !type_prop[0].values.length){
							throw new Error("Invalid vCard (Missing encoding)");
						}
						this.setPhoto(`data:image/${type_prop[0].values[0].toLowerCase()};base64,${token.values[0]}`);
					}else{
						this.setPhoto(token.values.join(";"));
					}
					break;
				case "BDAY":
					var [_, y, m, d, hr, mn, sec] = token.values[0]
						.replace(/[^\d]*/g, '')
						.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
						.map(n=>+n);
					this.setBday(new Date(Date.UTC(y, m-1, d, hr, mn, sec)));
					break;
				case "ANNIVERSARY":
					var [_, y, m, d, hr, mn, sec] = token.values[0]
						.replace(/[^\d]*/g, '')
						.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
						.map(n=>+n);
					this.setAnniversary(new Date(Date.UTC(y, m-1, d, hr, mn, sec)));
					break;
				case "GENDER":
					this.setGender(...token.values);
					break;
				case "ADR":
					var label_prop = token.props.filter(p=>p.property.toUpperCase() === "LABEL");
					var label = label_prop.length ? label_prop[0].values[0] : '';
					this.setAddress(...token.values, label);
					break;
				case "TEL":
					var phone = '', ext = '', type = [], pref = false;
					if(version === 3){
						phone = token.values[0].replace(/[^\d]/g, '');
						if(phone.length === 11 && phone[0] === '1'){
							phone = phone.substring(1)
						}
						var type_prop = token.props.filter(p=>p.property.toUpperCase() === "TYPE");
						if(type_prop.length){
							for(let n=0; n<type_prop[0].values.length; n++){
								if(type_prop[0].values[n] === 'pref') pref = true;
								else type.push(type_prop[0].values[n]);
							}
						}
					}else{
						console.log("parse v4 phone");
					}
					this.setPhone(phone, ext, type, pref);
					break;
					
			}
		}

		console.log(version, tokens);
	}
		
}

VCard.IM_PROTOCOL_SIP = 'sip';
VCard.IM_PROTOCOL_XMP = 'xmpp';
VCard.IM_PROTOCOL_IRC = 'irc';
VCard.IM_PROTOCOL_YMS = 'ymsgr';
VCard.IM_PROTOCOL_MSN = 'msn';
VCard.IM_PROTOCOL_AIM = 'aim';
VCard.IM_PROTOCOL_IM = 'im';

VCard.TEL_TYPE_TXT = 'text';
VCard.TEL_TYPE_VCE = 'voice';
VCard.TEL_TYPE_FAX = 'fax';
VCard.TEL_TYPE_CEL = 'cell';
VCard.TEL_TYPE_VID = 'video';
VCard.TEL_TYPE_PAG = 'pager';
VCard.TEL_TYPE_TPH = 'textphone';

VCard.KIND_IND = 'individual';
VCard.KIND_GRP = 'group';
VCard.KIND_ORG = 'org';
VCard.KIND_LOC = 'location';

VCard.GENDER_MAL = 'M';
VCard.GENDER_FEM = 'F';
VCard.GENDER_OTH = 'O';
VCard.GENDER_NON = 'N';
VCard.GENDER_UNK = 'U';
