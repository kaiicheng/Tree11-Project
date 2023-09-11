from kafka import KafkaConsumer
consumer = KafkaConsumer('test')
for message in consumer:
    print (message)
