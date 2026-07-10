import fitz, glob, os, re
src=r"C:\Users\HP\.codex\TupTuDu.com\temporary\pdf pudorysy"
os.chdir(src)
pdfs=sorted(glob.glob("*.pdf"))
print("PDF v korpusu:", len(pdfs))
# klíčová slova architektonického uvažování (dispozice/program/orientace/zóny/provoz)
KW=re.compile(r"z[óo]na|dispozic|orientac|program|provoz|obytn|koupeln|lo[žz]nic|chodb|z[áa]dve[řr]|s[ea]ver|jih|v[ýy]chod|z[áa]pad|denn[íi]|no[čc]n[íi]|kuchy|ob[ýy]v|technick|sp[íi][žz]|WC|p[ůu]dorys|m[íi]stnost|vstup|komunika|soukrom|spole[čc]",re.I)
corpus=[]
for f in pdfs:
    try: d=fitz.open(f)
    except Exception as e: print("chyba",f,e); continue
    txt=[]
    for i in range(min(d.page_count,80)):
        t=d[i].get_text("text")
        # ber jen odstavce s architektonickým uvažováním
        for para in re.split(r"\n\s*\n", t):
            p=para.strip().replace("\n"," ")
            p=re.sub(r"\s+"," ",p)
            if 60<len(p)<900 and len(KW.findall(p))>=3:
                txt.append(p)
    d.close()
    uniq=[]
    seen=set()
    for p in txt:
        k=p[:80]
        if k in seen: continue
        seen.add(k); uniq.append(p)
    corpus.append((f, uniq))
    print(f"{f[:44]:44} | odstavců s uvažováním: {len(uniq)}")
# ulož korpus
outdir=r"C:\Users\HP\.codex\TupTuDu.com\services\pudorys-parser"
os.makedirs(outdir,exist_ok=True)
with open(os.path.join(outdir,"korpus_uvazovani.txt"),"w",encoding="utf-8") as w:
    for f,ps in corpus:
        w.write(f"\n\n===== {f} =====\n")
        for p in ps: w.write("• "+p+"\n")
tot=sum(len(ps) for _,ps in corpus)
print("CELKEM odstavců:",tot)
