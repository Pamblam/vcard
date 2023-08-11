export class VCardParser{

	constructor(text, vcard){
		this.vcard = vcard;
		this.text = text;
		this.parse();
	}

	tokenizeVcardString(str){
		const unesc = str => str.replace(/\\,/g, ',')
			.replace(/\\;/g, ';')
			.replace(/\\:/g, ':')
			.replace(/\\\\/g, '\\')
			.replace(/\\n/g, "\n");

		let tokens = str.replace(/\n /g, '').split(/\n+/g).map(line=>{
			var [key_props, ...values] = line.match(/(\\.|[^:])+/g);
			values = (values.join(":").match(/(\\.|[^;])+/g)||[]).map(unesc);

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

	parseFNToken(token){
		this.vcard.setName(token.values[0]);
	}

	parseNicknameToken(token){
		token.values.forEach(n=>this.vcard.setNickname(n));
	}

	parsePhotoToken(token){
		if(this.vcard.specVersion === 3){
			let type_prop = token.props.filter(p=>p.property.toUpperCase() === "TYPE");
			if(!type_prop.length || !type_prop[0].values || !type_prop[0].values.length){
				throw new Error("Invalid vCard (Missing encoding)");
			}
			this.vcard.setPhoto(`data:image/${type_prop[0].values[0].toLowerCase()};base64,${token.values[0]}`);
		}else{
			this.vcard.setPhoto(token.values.join(";"));
		}
	}

	parseBDayToken(token){
		var [_, y, m, d, hr, mn, sec] = token.values[0]
			.replace(/[^\d]*/g, '')
			.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
			.map(n=>+n);
		this.vcard.setBday(new Date(Date.UTC(y, m-1, d, hr, mn, sec)));
	}

	parseAnniversaryToken(token){
		var [_, y, m, d, hr, mn, sec] = token.values[0]
			.replace(/[^\d]*/g, '')
			.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
			.map(n=>+n);
		this.vcard.setAnniversary(new Date(Date.UTC(y, m-1, d, hr, mn, sec)));
	}

	parseGenderToken(token){
		this.vcard.setGender(...token.values);
	}

	parseAddressToken(token){
		var label_prop = token.props.filter(p=>p.property.toUpperCase() === "LABEL");
		var label = label_prop.length ? label_prop[0].values[0] : '';
		this.vcard.setAddress(...token.values, label);
	}

	parsePhoneToken(token){
		var phone = '', ext = '', type = [], pref = false;
		phone = token.values[0].replace(/[^\d]/g, '');
		if(phone.length === 11 && phone[0] === '1'){
			phone = phone.substring(1)
		}
		if(this.vcard.specVersion === 3){
			var type_prop = token.props.filter(p=>p.property.toUpperCase() === "TYPE");
			if(type_prop.length){
				for(let n=0; n<type_prop[0].values.length; n++){
					if(type_prop[0].values[n] === 'pref') pref = true;
					else type.push(type_prop[0].values[n]);
				}
			}
		}else{
			var type_prop = token.props.filter(p=>p.property.toUpperCase() === "TYPE");
			if(type_prop.length) type = type_prop[0].values;
			var pref_prop = token.props.filter(p=>p.property.toUpperCase() === "PREF");
			if(pref_prop.length) pref = true;
			if(token.values.length > 1) ext = token.values[1].replace(/[^\d]/g, '');
		}
		this.vcard.setPhone(phone, ext, type, pref);
	}

	parseEmailToken(token){
		let email = token.values[0], pref = false;
		if(this.vcard.specVersion === 3){
			var type_prop = token.props.filter(p=>p.property.toUpperCase() === "TYPE");
			if(type_prop.length){
				for(let n=0; n<type_prop[0].values.length; n++){
					if(type_prop[0].values[n] === 'pref') pref = true;
				}
			}
		}else{
			var pref_prop = token.props.filter(p=>p.property.toUpperCase() === "PREF");
			if(pref_prop.length) pref = true;
		}
		this.vcard.setEmail(email, pref);
	}

	parseIMToken(token){
		var pref = false;
		var pref_prop = token.props.filter(p=>p.property.toUpperCase() === "PREF");
		if(pref_prop.length) pref = true;
		var [protocol, imurl] = token.values[0].split(":");
		this.vcard.setIM(imurl, protocol, pref);
	}

	parseTitleToken(token){
		this.vcard.setTitle(token.values[0]);
	}

	parseRoleToken(token){
		this.vcard.setRole(token.values[0]);
	}

	parseLogoToken(token){
		if(this.vcard.specVersion === 3){
			let type_prop = token.props.filter(p=>p.property.toUpperCase() === "TYPE");
			if(!type_prop.length || !type_prop[0].values || !type_prop[0].values.length){
				throw new Error("Invalid vCard (Missing encoding)");
			}
			this.vcard.setLogo(`data:image/${type_prop[0].values[0].toLowerCase()};base64,${token.values[0]}`);
		}else{
			this.vcard.setLogo(token.values.join(";"));
		}
	}

	parseOrgToken(token){
		this.vcard.setOrg(...token.values);
	}

	parseNoteToken(token){
		token.values.forEach(note=>this.vcard.setNote(note));
	}

	parseURLToken(token){
		token.values.forEach(url=>this.vcard.setURL(url));
	}

	parseKindToken(token){
		this.vcard.setKind(token.values[0]);
	}

	parseVersionToken(token){
		if(!["3.0", "4.0"].includes(token.values[0])){
			throw new Error("Invalid or incompatible vCard version.");
		}
		this.vcard.setVersion(parseInt(token.values[0]));
	}

	parseToken(token){
		if(!token.key || !token.values || !token.values.length){
			throw new Error("Invalid vCard (Invalid token)");
		}
		switch(token.key.toUpperCase()){
			case "VERSION":
				this.parseVersionToken(token);
				break;
			case "N": break;
			case "FN":
				this.parseFNToken(token);
				break;
			case "KIND":
				this.parseKindToken(token);
				break;
			case "NICKNAME":
				this.parseNicknameToken(token);
				break;
			case "PHOTO":
				this.parsePhotoToken(token);
				break;
			case "BDAY":
				this.parseBDayToken(token);
				break;
			case "ANNIVERSARY":
				this.parseAnniversaryToken(token);
				break;
			case "GENDER":
				this.parseGenderToken(token);
				break;
			case "ADR":
				this.parseAddressToken(token);
				break;
			case "TEL":
				this.parsePhoneToken(token);
				break;
			case "EMAIL":
				this.parseEmailToken(token);
				break;
			case "IMPP":
				this.parseIMToken(token);
				break;
			case "TITLE":
				this.parseTitleToken(token);
				break;
			case "ROLE":
				this.parseRoleToken(token);
				break;
			case "LOGO":
				this.parseLogoToken(token);
				break;
			case "ORG":
				this.parseOrgToken(token);
				break;
			case "NOTE":
				this.parseNoteToken(token);
				break;
			case "URL":
				this.parseURLToken(token);
				break;
		}
	}

	parse(){
		let tokens = this.tokenizeVcardString(this.text);
		
		// Check first
		let begin = tokens.shift();
		if(begin.key.toUpperCase() !== "BEGIN" || !begin.values[0] || begin.values[0].toUpperCase() !== "VCARD"){
			throw new Error("Invalid vCard");
		}

		// Check the last line
		let end = tokens.pop();
		if(end.key.toUpperCase() !== "END" || !end.values[0] || end.values[0].toUpperCase() !== "VCARD"){
			throw new Error("Invalid vCard");
		}

		// Version MUST be the first token
		if(tokens[0].key.toUpperCase() !== "VERSION"){
			throw new Error("Version missing or out of place.");
		}

		for(let token_index = 0; token_index<tokens.length; token_index++){
			let token = tokens[token_index];
			this.parseToken(token);
		}
	}

}