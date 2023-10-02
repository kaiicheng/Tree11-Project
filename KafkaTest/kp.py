from kafka import KafkaProducer
producer = KafkaProducer(bootstrap_servers='localhost:9092')
future=producer.send('test', b'Hello, World!')
result = future.get(timeout=60)
producer.send('test', key=b'message-two', value=b'This is Kafka-Python')
producer.flush()

