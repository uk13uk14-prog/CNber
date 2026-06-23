#!/usr/bin/env python3
"""E2E verify pricing catalog: tour_custom + vclass_luxury + route pricing."""
import json
import sys

import paramiko

HOST = "192.168.1.187"
USER = "agent001"
PASSWORD = "121212"
BASE = "http://127.0.0.1:3100/api"
LOGIN = {"phone": "13800000000", "password": "Admin123456"}


def run(client, cmd):
    _, o, e = client.exec_command(
        f"export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; {cmd}",
        timeout=60,
    )
    return (o.read() + e.read()).decode("utf-8", "replace")


def curl_json(client, method, path, token=None, body=None):
    data = json.dumps(body) if body is not None else None
    data_flag = f"-d '{data}'" if data else ""
    auth = f"-H 'Authorization: Bearer {token}'" if token else ""
    headers = "-H 'Content-Type: application/json'"
    cmd = f"curl -s -X {method} {BASE}{path} {headers} {auth} {data_flag}".strip()
    raw = run(client, cmd)
    try:
        return json.loads(raw), raw
    except json.JSONDecodeError:
        return None, raw


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    print("=== 1. Admin login ===")
    login, raw = curl_json(client, "POST", "/auth/login", body=LOGIN)
    if not login or login.get("code") != 0:
        print("FAIL login:", raw[:200])
        sys.exit(1)
    token = login["data"]["token"]
    print("OK token obtained")

    print("\n=== 2. List configs (expect service-types + vehicle-classes) ===")
    svc_list, _ = curl_json(client, "GET", "/admin/pricing/service-types", token=token)
    veh_list, _ = curl_json(client, "GET", "/admin/pricing/vehicle-classes", token=token)
    svc_items = svc_list.get("data", {}).get("items", []) if svc_list else []
    veh_items = veh_list.get("data", {}).get("items", []) if veh_list else []
    print(f"service-types: {len(svc_items)} items -> {[x['code'] for x in svc_items]}")
    print(f"vehicle-classes: {len(veh_items)} items -> {[x['code'] for x in veh_items]}")

    print("\n=== 3. Create service tour_custom ===")
    existing_svc = next((x for x in svc_items if x.get("code") == "tour_custom"), None)
    if existing_svc:
        tour_svc_id = existing_svc["_id"]
        print(f"SKIP create, already exists id={tour_svc_id}")
    else:
        created, raw = curl_json(
            client,
            "POST",
            "/admin/pricing/service-types",
            token=token,
            body={
                "code": "tour_custom",
                "label": "旅游定制",
                "sortOrder": 60,
                "remark": "E2E 验证",
                "enabled": True,
            },
        )
        if not created or created.get("code") != 0:
            print("FAIL create service:", raw[:300])
            sys.exit(1)
        tour_svc_id = created["data"]["item"]["_id"]
        print(f"OK created tour_custom id={tour_svc_id}")

    print("\n=== 4. Create vehicle vclass_luxury ===")
    existing_veh = next((x for x in veh_items if x.get("code") == "vclass_luxury"), None)
    if existing_veh:
        vclass_id = existing_veh["_id"]
        print(f"SKIP create, already exists id={vclass_id}")
    else:
        created, raw = curl_json(
            client,
            "POST",
            "/admin/pricing/vehicle-classes",
            token=token,
            body={
                "code": "vclass_luxury",
                "label": "奔驰 V Class",
                "seats": 7,
                "sortOrder": 70,
                "remark": "E2E 验证",
                "enabled": True,
            },
        )
        if not created or created.get("code") != 0:
            print("FAIL create vehicle:", raw[:300])
            sys.exit(1)
        vclass_id = created["data"]["item"]["_id"]
        print(f"OK created vclass_luxury id={vclass_id}")

    print("\n=== 5. Route pricing with tour_custom + vclass_luxury ===")
    route_body = {
        "serviceType": "tour_custom",
        "fromLabel": "London",
        "toLabel": "Oxford",
        "vehicleClass": "vclass_luxury",
        "customerPriceCny": 2800,
        "driverPriceGbp": 200,
        "remark": "E2E tour_custom route",
        "enabled": True,
    }
    routes_before, _ = curl_json(
        client,
        "GET",
        "/admin/pricing/routes?serviceType=tour_custom",
        token=token,
    )
    existing_route = None
    for r in routes_before.get("data", {}).get("rules", []) if routes_before else []:
        if (
            r.get("fromLabel") == "London"
            and r.get("toLabel") == "Oxford"
            and r.get("vehicleClass") == "vclass_luxury"
        ):
            existing_route = r
            break

    if existing_route:
        print(f"SKIP create route, already exists id={existing_route['_id']}")
        route_id = existing_route["_id"]
    else:
        created, raw = curl_json(
            client, "POST", "/admin/pricing/routes", token=token, body=route_body
        )
        if not created or created.get("code") != 0:
            print("FAIL create route:", raw[:400])
            sys.exit(1)
        rule = created.get("data", {}).get("rule", {})
        route_id = rule.get("_id")
        print(
            f"OK route id={route_id} "
            f"CNY={rule.get('customerPriceCny')} GBP={rule.get('driverPriceGbp')} "
            f"vehicleLabel={rule.get('vehicleLabel')}"
        )

    print("\n=== 6. Public catalog (client vehicle dropdown) ===")
    pub, _ = curl_json(client, "GET", "/catalog/vehicle-classes")
    pub_items = pub.get("data", {}).get("items", []) if pub else []
    codes = [x.get("code") for x in pub_items]
    labels = [x.get("label") for x in pub_items]
    has_vclass = "vclass_luxury" in codes
    print(f"catalog vehicle-classes: {len(pub_items)} items")
    print(f"codes: {codes}")
    print(f"vclass_luxury present: {has_vclass}")
    if has_vclass:
        idx = codes.index("vclass_luxury")
        print(f"label: {labels[idx]}")

    print("\n=== 7. Fixed pricing includes tour_custom if enabled ===")
    fixed, _ = curl_json(client, "GET", "/admin/pricing/fixed", token=token)
    fixed_codes = [r.get("serviceType") for r in fixed.get("data", {}).get("rules", [])] if fixed else []
    print(f"fixed pricing service types: {fixed_codes}")
    print(f"tour_custom in fixed list: {'tour_custom' in fixed_codes}")

    print("\n=== 8. Admin bundle on M1 ===")
    idx = run(
        client,
        "grep -o 'PricingRulesView-[^\"]*' /Users/agent001/Desktop/CNber/CNber_backend/public/admin/assets/index-*.js | head -1",
    ).strip()
    bundle = run(
        client,
        "ls /Users/agent001/Desktop/CNber/CNber_backend/public/admin/assets/PricingRulesView-*.js 2>/dev/null | tail -1",
    ).strip()
    print(f"index references: {idx or '(lazy)'}")
    print(f"bundle file: {bundle}")
    if bundle:
        grep = run(client, f"grep -c '服务类型管理' {bundle} || echo 0").strip()
        print(f"'服务类型管理' in bundle: {grep != '0'}")

    client.close()

    ok = has_vclass and "tour_custom" in fixed_codes
    print("\n=== RESULT ===")
    if ok:
        print("PASS: tour_custom + vclass_luxury + catalog OK")
    else:
        print("PARTIAL: check output above")
        sys.exit(1)


if __name__ == "__main__":
    main()
