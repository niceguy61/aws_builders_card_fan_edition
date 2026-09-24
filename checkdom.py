import re

t = open(r'C:\Users\sunny\AppData\Local\Temp\opencode\shots\dom2.txt', encoding='utf-16').read()
print('len:', len(t))
m = re.search(r'<title>.*?</title>', t)
print('title:', m.group(0) if m else None)
i = t.find('id="root"')
print('root seg:', t[i:i + 200] if i > 0 else None)
print('market-pile:', t.count('market-pile'))
print('opacity0:', len(re.findall(r'opacity:\s*0[^\.\d]', t)))
