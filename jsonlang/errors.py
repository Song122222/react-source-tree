class JsonLangError(Exception):
    pass


class ReturnSignal(Exception):
    def __init__(self, value):
        super().__init__("return")
        self.value = value


class BreakSignal(Exception):
    pass


class ContinueSignal(Exception):
    pass