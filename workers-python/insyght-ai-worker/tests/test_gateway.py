import math

from insyght_ai_worker.gateway import EMBEDDING_DIM, StubGateway, select_gateway


def test_stub_embedding_is_deterministic_unit_vector():
    gw = StubGateway()
    a = gw.embed(tenant_id="t1", text="kafka and postgres")
    b = gw.embed(tenant_id="t1", text="kafka and postgres")
    assert a == b
    assert len(a.vector) == EMBEDDING_DIM
    assert math.isclose(math.sqrt(sum(x * x for x in a.vector)), 1.0, rel_tol=1e-9)
    assert a.model == "pseudo-dev"


def test_different_text_gives_different_vector():
    gw = StubGateway()
    assert gw.embed(tenant_id=None, text="a").vector != gw.embed(tenant_id=None, text="b").vector


def test_unknown_gateway_falls_back_to_stub():
    assert isinstance(select_gateway({"AI_GATEWAY": "openai"}), StubGateway)
    assert isinstance(select_gateway({"AI_ARTIFACT_PROVIDER": "stub"}), StubGateway)
