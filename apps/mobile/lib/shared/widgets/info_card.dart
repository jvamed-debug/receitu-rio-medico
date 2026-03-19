import 'package:flutter/material.dart';

class InfoCard extends StatelessWidget {
  const InfoCard({
    required this.title,
    required this.items,
    super.key,
  });

  final String title;
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            ...items.map(
              (item) => Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF7FAF8),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFD7E6DD)),
                ),
                child: Text(item),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
