// api/_geoIp.ts
// Geolocație IP pentru alertele de securitate. Nu face niciodată throw și nu
// depășește ~2s — alerta trebuie să plece oricum, cu locația "necunoscută".
// Prefixul "_" = helper, nu funcție Vercel (planul Hobby are limită de funcții).

export interface InfoGeoIp {
    oras?: string;
    tara?: string;
    isp?: string;
    vpnProxy?: boolean;
    datacenter?: boolean;
}

export async function cautaGeoIp(ip: string): Promise<InfoGeoIp | null> {
    if (!ip || ip === 'necunoscut') return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
        // ip-api.com: gratuit, fără cheie; planul free e doar HTTP (apel server-side,
        // nu transportă secrete).
        const r = await fetch(
            `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,isp,proxy,hosting`,
            { signal: controller.signal },
        );
        if (!r.ok) return null;
        const d: any = await r.json();
        if (d?.status !== 'success') return null;
        return {
            oras: d.city || undefined,
            tara: d.country || undefined,
            isp: d.isp || undefined,
            vpnProxy: !!d.proxy,
            datacenter: !!d.hosting,
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export function formateazaGeoIp(geo: InfoGeoIp | null): string {
    if (!geo) return 'Locație: necunoscută (serviciul de geolocație nu a răspuns sau IP privat)';
    const loc = [geo.oras, geo.tara].filter(Boolean).join(', ') || 'necunoscută';
    const flaguri: string[] = [];
    if (geo.vpnProxy) flaguri.push('VPN/proxy');
    if (geo.datacenter) flaguri.push('datacenter/hosting');
    return `Locație: ${loc}\nFurnizor (ISP): ${geo.isp || 'necunoscut'}\nSuspect: ${flaguri.length ? 'DA — ' + flaguri.join(', ') : 'nu (IP rezidențial/mobil)'}`;
}
