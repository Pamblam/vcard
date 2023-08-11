const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const {VCard} = require('../dist/ez-vcard.js');

function imgToDataURI(file){
	const data = fs.readFileSync(file, 'base64');
	const type = mime.lookup(file);
	return `data:${type};base64,${data}`;
}

const photoURI = imgToDataURI(path.resolve(__dirname, 'photo.png'));
const logoURI = imgToDataURI(path.resolve(__dirname, 'logo.png'));

describe('Generation and Parser Tests', function () {

	it('should generate a V3 vCard and parse it successfully', async function () {

		let text_v3 = await new VCard()
			.setVersion(3)
			.setName('Pamela Mishaw')
			.setNickname('Moon')
			.setPhoto(photoURI)
			.setPhone('8136160999', '', ['cell', 'video'], true)
			.setEmail('apples@gmial.com', true)
			.setBday(new Date(1989, 0, 17))
			.setAddress('123 main st', 'Clearwater', 'FL', '33584', 'USA', 'My House, in the middle of my street')
			.setTitle('Super babe')
			.setRole('Corn cleaner')
			.setLogo(logoURI)
			.setOrg('Rob co, inc', 'Fart division', 'Butts department')
			.setNote(`Woah, black betty; pambalam..`)
			.setURL('http://www.google.com')
			.render();

		let parsed_v3 = await new VCard(text_v3).render();
		assert.equal(text_v3, parsed_v3);

	});

	it('should generate a V4 vCard and parse it successfully', async function () {
		
		let text_v4 = await new VCard()
			.setVersion(4)
			.setKind(VCard.KIND_IND)
			.setName('Pamela Mish,aw')
			.setNickname('Mo:on')
			.setGender(VCard.GENDER_MAL, "Funky ;Chicken")
			.setPhoto(photoURI)
			.setPhone('8136160999', '123', ['cell', 'video'], true)
			.setEmail('apples@gmial.com', true)
			.setBday(new Date(1989, 0, 17))
			.setAnniversary(new Date(1996, 7, 28))
			.setAddress('123 main st', 'Clearwater', 'FL', '33584', 'USA', 'My House, in t;he middle of my street')
			.setIM('rob@out.com', VCard.IM_PROTOCOL_SIP, true)
			.setTitle('Super b;abe')
			.setRole('Corn c:leaner')
			.setLogo(logoURI)
			.setOrg('Rob co, inc', 'Fart di;vision', 'Butts depar\'tment')
			.setNote(`Woah, black betty; pambalam..`)
			.setURL('http://www.google.com')
			.render();

		let parsed_v4 = await new VCard(text_v4).render();

		assert.equal(text_v4, parsed_v4);
	});

	it('should throw errors parser is given bad vCard', async function () {
		let error_count = 0;

		try{
			// Missing PHOTO TYPE parameter
			new VCard(`BEGIN:VCARD
VERSION:3.0
FN:Pamela Mishaw
N:Mishaw;Pamela
PHOTO;ENCODING=b:iVBORw0KGgoAAAANSUhEUgAAAJYAAAC1CAYAAAC9OQZ6AAAjE
END:VCARD`);
		}catch(e){error_count++}

		try{
			// Missing LOGO TYPE parameter
			new VCard(`BEGIN:VCARD
VERSION:3.0
FN:Pamela Mishaw
N:Mishaw;Pamela
LOGO;ENCODING=b:iVBORw0KGgoAAAANSUhEUgAAAJYAAAC1CAYAAAC9OQZ6AAAjE
END:VCARD`);
		}catch(e){error_count++}

		// No error should be thrown
		try{
			new VCard(`BEGIN:VCARD
VERSION:4.0
ADR:;;123 main st;Clearwater;FL;33584;USA
FN:Pamela Mishaw
N:Mishaw;Pamela
END:VCARD`);
		}catch(e){error_count++}

		try{
			// Invalid Version
			new VCard(`BEGIN:VCARD
VERSION:2.0
FN:Pamela Mishaw
N:Mishaw;Pamela
END:VCARD`);
		}catch(e){error_count++}

		try{
			// No token value
			new VCard(`BEGIN:VCARD
VERSION:3.0
FN
N:Mishaw;Pamela
END:VCARD`);
		}catch(e){error_count++}

		try{
			// Missing BEGIN
			new VCard(`VERSION:4.0
FN:Pamela Mishaw
N:Mishaw;Pamela
END:VCARD`);
		}catch(e){error_count++}

		try{
			// Missing END
			new VCard(`BEGIN:VCARD
VERSION:4.0
FN:Pamela Mishaw
N:Mishaw;Pamela`);
		}catch(e){error_count++}

		try{
			// Missing VERSION
			new VCard(`BEGIN:VCARD
FN:Pamela Mishaw
N:Mishaw;Pamela
END:VCARD`);
		}catch(e){error_count++}

		assert.equal(error_count, 7);
	});

	it('should throw errors generator is given bad data', async function () {
		let error_count = 0;

		// Unsupported version: 2
		try{
			new VCard().setVersion(2);
		}catch(e){error_count++}

		// Invalid Kind value.
		try{
			new VCard().setKind('animal');
		}catch(e){error_count++}

		// Invalid Anniversary date
		try{
			new VCard().setAnniversary('January 3');
		}catch(e){error_count++}

		// Invalid Gender value.
		try{
			new VCard().setGender('boy');
		}catch(e){error_count++}

		// Invalid Type value.
		try{
			new VCard().setPhone('8675309', undefined, ['phone']);
		}catch(e){error_count++}

		// NO error
		try{
			new VCard().setPhone('8675309');
		}catch(e){error_count++}

		// Invalid Image Data URI
		try{
			new VCard().setPhoto('photo.jpg');
		}catch(e){error_count++}

		// Invalid Birthday date
		try{
			new VCard().setBday('January 3');
		}catch(e){error_count++}

		// NO error
		try{
			new VCard().setAddress();
		}catch(e){error_count++}

		// Invalid Email value.
		try{
			new VCard().setEmail("not an email");
		}catch(e){error_count++}

		// No Error
		try{
			new VCard()
				.setEmail("email@me.com", true)
				.setEmail("email@you.com", true);
		}catch(e){error_count++}

		// No error
		try{
			new VCard()
				.setPhone("8187776543", '123', 'text', true)
				.setPhone("8187776543", '123', 'text', true);
		}catch(e){error_count++}

		// Invalid Protocol value.
		try{
			new VCard().setIM("me@host.com", 'protocol');
		}catch(e){error_count++}

		// NO error
		try{
			new VCard()
				.setIM("me@host.com", VCard.IM_PROTOCOL_SIP, true)
				.setIM("you@host.com", VCard.IM_PROTOCOL_SIP, true);
		}catch(e){error_count++}

		// Invalid Image Data URI
		try{
			new VCard().setLogo('logo.jpg');
		}catch(e){error_count++}

		// No error
		try{
			await new VCard()
				.setVersion(3)
				.setNickname('')
				.setName("Bob")
				.setNote("A note with some escapable chars: :;,\\\n")
				.setPhoto('data:image/png;base64,FAKEDATAFAKEDATA\\')
				.render();
		}catch(e){error_count++}

		// Missing Kind property (Required in Version 4)
		try{
			await new VCard()
				.setName("Bob")
				.render();
		}catch(e){error_count++}

		// Missing Name property.
		try{
			await new VCard()
				.setVersion(3)
				.render();
		}catch(e){error_count++}

		assert.equal(error_count, 12);
	});

});